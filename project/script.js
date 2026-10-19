const dropdown = document.getElementById('deparments');
const btn = document.getElementById('submit'); 

  //we wanna only return art with IMAGES 
  //we wanna show a lot of art (80 req/sec api limit) and hace user scroll down to see them

const savedPieces = {}; // deptId -> pieces we already found, so picking a dept again is instant

getDepts();

btn.addEventListener('click', async () => {
    const deptChoiceId = dropdown.value;

    btn.disabled = true; // stop double clicks from firing a second batch of requests
    const validPieces = await getDeptPieces(deptChoiceId);
    btn.disabled = false;

    if (validPieces.length === 0) {
        console.log('no pieces with images found');
        return;
    }

    // clear old cards and show all pieces
    const artworkContainer = document.getElementById('artwork-container') || document.querySelector('.artwork');
    artworkContainer.innerHTML = ''; // clear it

    for (const piece of validPieces) {
        displayArt(piece.title, piece.artistDisplayName, piece.department, piece.objectDate, piece.primaryImage, artworkContainer);
    }
});


async function getDepts(){ //saves the departments as dropdowns 
    try{
        const deptsRes = await fetch('https://collectionapi.metmuseum.org/public/collection/v1/departments');
        const deptData = await deptsRes.json();

        for (const dept of deptData.departments) {
                // 1. Create an <option> element
            const option = document.createElement('option');

                // 2. Set its value to dept.departmentId
            option.value = dept.departmentId;
        
                // 3. Set its textContent to dept.displayName
            option.textContent = dept.displayName; 
                // 4. Append it to your dropdown
            dropdown.appendChild(option);
        }
    } catch (error){
        console.log('oops! no depts returned', error); 
    }
}

async function getDeptPieces(deptChoiceId)
{
    if (savedPieces[deptChoiceId]) return savedPieces[deptChoiceId]; // already looked this dept up

    const validPieces = [];

    try
    {
        const resp = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1.1/search?departmentId=${deptChoiceId}&q=art&hasImages=true`);
        const pieceData = await resp.json(); 

        const pieces = pieceData.objectIDs || []; // from dept X store all the object ids (null if none)

        // check ids 5 at a time instead of 1 at a time -> faster, but gentle enough not to get blocked
        for (let i = 0; i < pieces.length && validPieces.length < 10; i += 5) {
            const batch = pieces.slice(i, i + 5);
            const results = await Promise.all(batch.map(getArt)); // fetch all 5 at once, wait for all

            for (const data of results) {
                if (data) validPieces.push(data); // getArt gives null for bad ones
            }
        }
    }
    catch (error){
        // a fetch threw (e.g. 403 = the Met blocked us) -> stop asking, keep what we found so far
        console.log('error getting dept pieces', error);
    }

    const found = validPieces.slice(0, 10);
    if (found.length > 0) savedPieces[deptChoiceId] = found; // don't save an empty result from being blocked
    return found;
}

//https://collectionapi.metmuseum.org/public/collection/v1/objects/{objectID}
async function getArt(id)
{
    //gets info of ONE art piece, or null if it's not usable
    try {
        const res = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        if (!res.ok) return null; // 404 -> "Not a valid object" (the search index lists ids the objects endpoint won't serve)

        const data = await res.json(); //necessary to extract the body (res comes with res.status, res.ok, etc )
        if (!data.primaryImage) return null; // "" or missing -> no image

        return data;
    } catch (error) {
        return null; // network error, skip this one
    }
}


function displayArt(artTitle, artist, dept, date, img, container){
        // create a card div to hold one piece of art
        const card = document.createElement('div');
        card.className = 'art-card'; // for CSS styling later

        // create and set the image
        const artImg = document.createElement('img');
        artImg.src = img;
        artImg.alt = artTitle;
        card.appendChild(artImg);

        // create and set the title
        const titleEl = document.createElement('p');
        titleEl.textContent = `Title: ${artTitle}`;
        card.appendChild(titleEl);

        // create and set the artist
        const artistEl = document.createElement('p');
        artistEl.textContent = `Artist: ${artist}`;
        card.appendChild(artistEl);

        // create and set the department
        const deptEl = document.createElement('p');
        deptEl.textContent = `Department: ${dept}`;
        card.appendChild(deptEl);

        // create and set the date
        const dateEl = document.createElement('p');
        dateEl.textContent = `Date: ${date}`;
        card.appendChild(dateEl);

        // add the finished card to the container
        container.appendChild(card);
}
