// Everything that talks to the outside world: the Met API and Wikipedia.

const MET = '/met-api'; // through our own server: see the note at the top of server.mjs
const MET_IMAGES = 'https://images.metmuseum.org/CRDImages/';
const PIECES_PER_ROOM = 8;
const MAX_OBJECTS_CHECKED = 20; // departments with few images shouldn't turn into a flood of requests
const PAUSE_BETWEEN_BATCHES = 300;

const savedRooms = {}; // roomId -> pieces we already found, so walking back is instant

export async function getRoomPieces(room)
{
    if (savedRooms[room.id]) return savedRooms[room.id];

    // highlights first, then the rest of the department to fill out the wall
    const highlights = await searchIds(room.id, 'isHighlight=true&limit=40');
    const general = highlights.length >= PIECES_PER_ROOM ? [] : await searchIds(room.id, 'limit=40');
    const ids = [...new Set([...shuffle(highlights), ...shuffle(general)])];

    const pieces = [];
    const toCheck = ids.slice(0, MAX_OBJECTS_CHECKED);

    // 5 at a time, same as the feed: fast, but gentle enough not to get blocked
    for (let i = 0; i < toCheck.length && pieces.length < PIECES_PER_ROOM; i += 5) {
        if (i > 0) await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_BATCHES));

        const results = await Promise.all(toCheck.slice(i, i + 5).map(getArt));
        if (results.includes('blocked')) break; // the Met asked us to stop, so keep what we have

        for (const data of results) {
            if (data) pieces.push(data);
        }
    }

    const found = pieces.slice(0, PIECES_PER_ROOM);
    await Promise.all(found.map(addDescription));

    if (found.length > 0) savedRooms[room.id] = found; // don't save an empty result from being blocked
    return found;
}

export function imageUrl(metUrl)
{
    return `/met-image?path=${encodeURIComponent(metUrl.replace(MET_IMAGES, ''))}`;
}

async function searchIds(deptId, extraParams)
{
    try {
        const res = await fetch(`${MET}/v1.1/search?departmentId=${deptId}&q=art&hasImages=true&${extraParams}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.objectIDs || [];
    } catch (error) {
        console.log('search failed', error);
        return [];
    }
}

async function getArt(id)
{
    try {
        const res = await fetch(`${MET}/v1/objects/${id}`);
        if (res.status === 403 || res.status === 429 || res.status === 503) return 'blocked';
        if (!res.ok) return null; // the search index lists ids the objects endpoint won't serve

        const data = await res.json();
        if (!data.primaryImageSmall) return null;

        return data;
    } catch (error) {
        return null;
    }
}

// The Met doesn't publish a description, so a work's paragraph comes from Wikipedia.
// Going through the Wikidata id the Met gives us means we get the right article, not a guess by title.
async function addDescription(piece)
{
    const fromWork = await wikipediaSummary(piece.objectWikidata_URL);
    const fromArtist = fromWork ? null : await wikipediaSummary(piece.artistWikidata_URL);

    piece.description = shorten(fromWork || fromArtist) || fallbackDescription(piece);
    piece.descriptionIsWikipedia = Boolean(fromWork || fromArtist);
}

async function wikipediaSummary(wikidataUrl)
{
    const id = wikidataUrl?.split('/').pop();
    if (!id) return null;

    try {
        const lookup = await fetchWithTimeout(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${id}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`);
        const entity = (await lookup.json()).entities?.[id];
        const title = entity?.sitelinks?.enwiki?.title;
        if (!title) return null;

        const res = await fetchWithTimeout(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        if (!res.ok) return null;

        const summary = await res.json();
        return summary.type === 'standard' ? summary.extract : null;
    } catch (error) {
        return null; // a work without a paragraph still hangs on the wall
    }
}

function fetchWithTimeout(url)
{
    return fetch(url, { signal: AbortSignal.timeout(4000) });
}

// keep whole sentences, as many as fit on the wall
function shorten(text, limit = 340)
{
    if (!text) return '';

    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
    let kept = '';

    for (const { segment } of segmenter.segment(text)) {
        if (kept && kept.length + segment.length > limit) break;
        kept += segment;
    }

    return kept.trim();
}

function fallbackDescription(piece)
{
    const subjects = (piece.tags || []).map((tag) => tag.term).slice(0, 4);
    return subjects.length > 0 ? `Subjects: ${subjects.join(', ')}.` : '';
}

function shuffle(list)
{
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
