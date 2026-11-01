// Wall text is drawn to a canvas and hung in the scene, so it takes the room's light like real vinyl.
import * as THREE from 'three';

const PX_PER_METER = 800;

// a fresh canvas for each block of text; the height is measured from what was actually drawn
function newBlock(widthM)
{
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(widthM * PX_PER_METER);
    canvas.height = 2400;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'alphabetic';

    return { canvas, ctx, y: 0 };
}

function wrap(ctx, text, width)
{
    const lines = [];
    let line = '';

    for (const word of text.split(/\s+/)) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > width && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }

    if (line) lines.push(line);
    return lines;
}

function drawLines(block, text, { font, size, leading, tracking = 0, alpha = 1, after = 0 })
{
    const { ctx, canvas } = block;

    ctx.font = font;
    ctx.letterSpacing = `${tracking}px`;
    ctx.globalAlpha = alpha;

    for (const line of wrap(ctx, text, canvas.width)) {
        block.y += size * leading;
        ctx.fillText(line, 0, block.y);
    }

    block.y += after;
}

// biggest title size that stays within the line limit
function titleSize(ctx, title, width, maxSize, maxLines)
{
    for (let size = maxSize; size > 56; size -= 6) {
        ctx.font = `${size}px Anton`;
        ctx.letterSpacing = `${size * 0.012}px`;

        const lines = wrap(ctx, title, width);
        const fits = lines.length <= maxLines && lines.every((line) => ctx.measureText(line).width <= width);
        if (fits) return size;
    }
    return 56;
}

function finish(block)
{
    const height = Math.ceil(block.y + 24);

    // crop to what was drawn so the plane in the scene is exactly the size of the text
    const cropped = document.createElement('canvas');
    cropped.width = block.canvas.width;
    cropped.height = height;
    cropped.getContext('2d').drawImage(block.canvas, 0, 0);

    const texture = new THREE.CanvasTexture(cropped);
    texture.anisotropy = 16;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    return { texture, width: cropped.width / PX_PER_METER, height: height / PX_PER_METER };
}

export function pieceText(piece, widthM)
{
    const block = newBlock(widthM);
    const { ctx, canvas } = block;

    const title = piece.title.replace(/\s*\([^)]*\)/g, '').toUpperCase(); // long translated asides crush the type
    const size = titleSize(ctx, title, canvas.width, 148, 3);
    drawLines(block, title, { font: `${size}px Anton`, size, leading: 1.14, tracking: size * 0.012, after: 34 });

    const artist = piece.artistDisplayName || piece.culture || piece.department;
    drawLines(block, artist, { font: 'italic 66px Newsreader', size: 66, leading: 1.2, after: 4 });
    if (piece.artistDisplayBio) {
        drawLines(block, piece.artistDisplayBio, { font: '42px Newsreader', size: 42, leading: 1.3, alpha: 0.72 });
    }
    block.y += 40;

    if (piece.description) {
        drawLines(block, piece.description, { font: '56px Newsreader', size: 56, leading: 1.36, after: 40 });
    }

    const details = [piece.objectDate, piece.medium, piece.dimensions].filter(Boolean).join('. ');
    drawLines(block, details, { font: '42px Newsreader', size: 42, leading: 1.34, alpha: 0.78, after: 8 });
    if (piece.creditLine) {
        drawLines(block, piece.creditLine, { font: '42px Newsreader', size: 42, leading: 1.34, alpha: 0.78 });
    }
    if (piece.descriptionIsWikipedia) {
        block.y += 8;
        drawLines(block, 'Text from Wikipedia, CC BY-SA 4.0', { font: 'italic 34px Newsreader', size: 34, leading: 1.3, alpha: 0.6 });
    }

    return finish(block);
}

export function introText(room, count, widthM)
{
    const block = newBlock(widthM);
    const { ctx, canvas } = block;

    const name = room.name.toUpperCase();
    const size = titleSize(ctx, name, canvas.width, 300, 3);
    drawLines(block, name, { font: `${size}px Anton`, size, leading: 1.14, tracking: size * 0.012, after: 50 });
    drawLines(block, room.intro, { font: '66px Newsreader', size: 66, leading: 1.34, after: 40 });
    drawLines(block, `${count} works on this wall.`, { font: 'italic 48px Newsreader', size: 48, leading: 1.3, alpha: 0.75 });

    return finish(block);
}

export function nextRoomText(room, widthM)
{
    const block = newBlock(widthM);
    const { ctx, canvas } = block;

    drawLines(block, 'Next room', { font: 'italic 72px Newsreader', size: 72, leading: 1.3, after: 16 });

    const name = room.name.toUpperCase();
    const size = titleSize(ctx, name, canvas.width, 240, 3);
    drawLines(block, name, { font: `${size}px Anton`, size, leading: 1.14, tracking: size * 0.012 });

    return finish(block);
}
