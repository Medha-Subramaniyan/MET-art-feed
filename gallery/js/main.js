// Walking: turns scroll, drag, keys and clicks into where you're standing, and keeps the HUD honest.
import * as THREE from 'three';
import { ROOMS } from './rooms.js';
import { getRoomPieces, imageUrl } from './met.js';
import { Gallery, EYE_HEIGHT } from './gallery.js';

const $ = (id) => document.getElementById(id);
const canvas = $('stage');

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let gallery;
try {
    gallery = new Gallery(canvas, reducedMotion);
} catch (error) {
    setStatus('This room needs WebGL, and your browser isn’t offering it. The plain feed is <a class="link" href="../project/">here</a>.', true);
    throw error;
}

const camera = gallery.camera;
const raycaster = new THREE.Raycaster();
const textureLoader = new THREE.TextureLoader();

const view = {
    stop: 0,        // where you've decided to go, in bays. can be fractional mid-scroll
    walk: 0,        // where you actually are
    closer: null,   // the bay you've stepped up to, if any
    x: 0, y: EYE_HEIGHT, z: 7, lookX: 0, lookY: EYE_HEIGHT,
    pointerX: 0, pointerY: 0, driftX: 0, driftY: 0,
};

let roomIndex = 0;
let pieces = [];
let master = 0;       // all the room's lamps together
let masterTarget = 0;
let currentBay = -1;
let snapTimer = null;
let changing = false;

function nextRoomOf(index)
{
    return ROOMS[(index + 1) % ROOMS.length];
}

/* ---------- rooms ---------- */

function buildRoomList()
{
    const list = $('rooms');

    ROOMS.forEach((room, i) => {
        const button = document.createElement('button');
        button.className = 'room';

        const swatch = document.createElement('span');
        swatch.className = 'swatch';
        swatch.style.background = room.wall;
        button.append(swatch, room.name);

        button.addEventListener('click', () => {
            toggleRoomList(false);
            if (i !== roomIndex) enterRoom(i);
        });
        list.appendChild(button);
    });
}

function toggleRoomList(open)
{
    $('rooms').hidden = !open;
    $('rooms-toggle').setAttribute('aria-expanded', open);
    $('rooms-toggle').textContent = open ? 'Close' : 'Rooms';
}

function loadTexture(piece)
{
    return new Promise((resolve) => {
        textureLoader.load(imageUrl(piece.primaryImageSmall), (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = gallery.maxAnisotropy;
            piece.texture = texture;
            resolve(piece);
        }, undefined, () => resolve(null));
    });
}

function usable(piece)
{
    if (!piece) return false;
    const aspect = piece.texture.image.width / piece.texture.image.height;
    return aspect > 0.38 && aspect < 2.6; // scrolls and long fragments don't hang well on this wall
}

async function enterRoom(index)
{
    if (changing) return;
    changing = true;

    const room = ROOMS[index];
    const first = pieces.length === 0;
    setStatus(first ? `Opening ${room.name}…` : '', true);
    $('now-title').textContent = first ? '' : `Walking to ${room.name}…`;

    const loaded = (await getRoomPieces(room).then((found) => Promise.all(found.map(loadTexture)))).filter(usable);

    if (loaded.length === 0) {
        changing = false;
        showClosed(index);
        return;
    }

    // the lights go out on the old room, and the new one is hung in the dark
    masterTarget = 0;
    await wait(reducedMotion || first ? 0 : 500);

    const previous = pieces;
    pieces = loaded;
    roomIndex = index;
    gallery.hang(room, pieces, nextRoomOf(index));
    for (const piece of previous) {
        if (!pieces.includes(piece)) releaseHighRes(piece);
    }

    view.stop = view.walk = 0;
    view.closer = null;
    view.x = view.lookX = gallery.bays[0].x;
    view.z = gallery.viewDistance();
    currentBay = -1;

    document.querySelectorAll('.room').forEach((button, i) => {
        button.setAttribute('aria-current', i === index);
    });

    setStatus('');
    await wait(reducedMotion ? 0 : 250);
    masterTarget = 1;
    changing = false;
}

function releaseHighRes(piece)
{
    piece.highRes?.dispose();
    piece.highRes = null;
}

function showClosed(index)
{
    setStatus('The Met isn’t answering right now. <button class="link" id="retry">Try the door again</button>', true);
    $('retry').addEventListener('click', () => enterRoom(index));
}

function setStatus(html, on = Boolean(html))
{
    const status = $('status');
    status.innerHTML = html;
    status.classList.toggle('on', on);
}

function wait(ms)
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ---------- walking ---------- */

const lastStop = () => Math.max(gallery.bays.length - 1, 0);

function goTo(stop)
{
    view.stop = THREE.MathUtils.clamp(stop, 0, lastStop());
}

function walk(direction)
{
    if (view.closer) stepBack();
    goTo(Math.round(view.stop) + direction);
}

function snapSoon()
{
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => goTo(Math.round(view.stop)), 160);
}

function stepCloser(bay)
{
    view.closer = bay;
    document.body.classList.add('closer');
    canvas.classList.add('closer');
    loadHighRes(bay);
}

function stepBack()
{
    view.closer = null;
    document.body.classList.remove('closer');
    canvas.classList.remove('closer');
}

// Only worth downloading the full-size image once someone has actually walked up to it.
async function loadHighRes(bay)
{
    const piece = bay.piece;
    if (piece.highRes || !piece.primaryImage) return;

    try {
        const res = await fetch(imageUrl(piece.primaryImage));
        if (!res.ok) return;

        const bitmap = await createImageBitmap(await res.blob(), {
            imageOrientation: 'flipY',
            resizeWidth: Math.min(piece.texture.image.width * 3, 2800),
            resizeQuality: 'high',
        });

        if (gallery.bays.includes(bay)) gallery.setHighRes(bay, new THREE.CanvasTexture(bitmap));
    } catch (error) {
        console.log('high res image failed, keeping the smaller one', error);
    }
}

function activate(bay)
{
    if (bay.kind === 'next') {
        enterRoom(ROOMS.indexOf(bay.nextRoom));
        return;
    }

    const index = gallery.bays.indexOf(bay);
    if (index === Math.round(view.walk)) {
        if (view.closer) stepBack(); else stepCloser(bay);
    } else {
        goTo(index);
    }
}

function bayAtPointer(event)
{
    const pointer = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    return gallery.pick(raycaster);
}

/* ---------- input ---------- */

window.addEventListener('wheel', (event) => {
    if (event.target !== canvas) return;
    event.preventDefault();

    if (view.closer) {
        if (Math.abs(event.deltaY) > 8 && event.deltaY > 0) stepBack();
        return;
    }

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    goTo(view.stop + THREE.MathUtils.clamp(delta, -120, 120) * 0.0024);
    snapSoon();
}, { passive: false });

let drag = null;

canvas.addEventListener('pointerdown', (event) => {
    drag = { x: event.clientX, stop: view.stop, moved: 0 };
    canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
    view.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    view.pointerY = (event.clientY / window.innerHeight) * 2 - 1;

    if (drag) {
        const dx = event.clientX - drag.x;
        drag.moved = Math.max(drag.moved, Math.abs(dx));
        if (!view.closer && drag.moved > 6) {
            canvas.classList.add('dragging');
            goTo(drag.stop - dx / (window.innerWidth * 0.55));
        }
    } else if (event.pointerType === 'mouse' && !view.closer) {
        canvas.classList.toggle('pointing', Boolean(bayAtPointer(event)));
    }
});

canvas.addEventListener('pointerup', (event) => {
    if (!drag) return;
    const clicked = drag.moved <= 6;
    drag = null;
    canvas.classList.remove('dragging');

    if (!clicked) {
        goTo(Math.round(view.stop));
        return;
    }

    if (view.closer) {
        stepBack();
        return;
    }

    const bay = bayAtPointer(event);
    if (bay) activate(bay);
});

window.addEventListener('keydown', (event) => {
    if (event.target.closest?.('button, a')) {
        if (event.key === 'Enter' || event.key === ' ') return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') walk(1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') walk(-1);
    else if (event.key === 'Escape') {
        if (!$('rooms').hidden) toggleRoomList(false);
        else if (view.closer) stepBack();
    } else if (event.key === 'Enter' || event.key === ' ') {
        const bay = gallery.bays[Math.round(view.walk)];
        if (bay && bay.kind !== 'intro') activate(bay);
    } else {
        return;
    }
    event.preventDefault();
});

$('prev').addEventListener('click', () => walk(-1));
$('next').addEventListener('click', () => walk(1));
$('rooms-toggle').addEventListener('click', () => toggleRoomList($('rooms').hidden));

window.addEventListener('resize', () => {
    const wasPortrait = gallery.portrait;
    gallery.resize();
    if (wasPortrait !== gallery.portrait && pieces.length > 0) {
        stepBack();
        gallery.hang(ROOMS[roomIndex], pieces, nextRoomOf(roomIndex));
        currentBay = -1;
    }
});

/* ---------- HUD ---------- */

function announce(index)
{
    const bay = gallery.bays[index];
    const total = pieces.length;
    const link = $('now-link');

    $('prev').disabled = index === 0;
    $('next').disabled = index === gallery.bays.length - 1;
    $('hint').textContent = bay.kind === 'next'
        ? 'Click to walk through.'
        : 'Scroll to walk. Click a work to step closer.';

    if (bay.kind === 'piece') {
        const { piece } = bay;
        $('now-count').textContent = `${String(index).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
        $('now-title').textContent = piece.title;
        link.href = piece.objectURL;
        link.hidden = !piece.objectURL;
        $('spoken').textContent = [
            piece.title, piece.artistDisplayName, piece.objectDate, piece.medium, piece.description,
        ].filter(Boolean).join('. ');
    } else {
        const name = bay.kind === 'intro' ? ROOMS[roomIndex].name : `Next room: ${bay.nextRoom.name}`;
        $('now-count').textContent = '';
        $('now-title').textContent = name;
        link.hidden = true;
        $('spoken').textContent = name;
    }
}

/* ---------- the frame loop ---------- */

function damp(current, target, speed, dt)
{
    if (reducedMotion) return target;
    return current + (target - current) * (1 - Math.exp(-speed * dt));
}

function xAlongWall(walk)
{
    const { bays } = gallery;
    const from = bays[Math.floor(walk)];
    const to = bays[Math.min(Math.ceil(walk), bays.length - 1)];
    return from.x + (to.x - from.x) * (walk - Math.floor(walk));
}

const timer = new THREE.Timer();
let slowFrames = 0;

function frame(timestamp)
{
    requestAnimationFrame(frame);

    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    const time = timer.getElapsed();

    if (gallery.bays.length === 0) {
        gallery.render(time, 0);
        return;
    }

    view.walk = damp(view.walk, view.stop, 3.4, dt);
    master = damp(master, masterTarget, masterTarget > master ? 1.5 : 6, dt);

    const nearest = Math.round(view.walk);
    gallery.setLit(nearest, reducedMotion ? 1 : dt);
    gallery.updateLamps(nearest, master);

    if (nearest !== currentBay) {
        currentBay = nearest;
        announce(nearest);
    }

    let targetX = xAlongWall(view.walk);
    let targetY = gallery.portrait ? 2.05 : EYE_HEIGHT;
    let targetZ = gallery.viewDistance();
    let lookX = targetX;
    let lookY = gallery.portrait ? 2.05 : EYE_HEIGHT - 0.28; // a touch low, so the floor's reflections are in the picture

    // a small sway with the pointer is enough to show the frames have depth
    view.driftX = damp(view.driftX, reducedMotion ? 0 : view.pointerX, 2.2, dt);
    view.driftY = damp(view.driftY, reducedMotion ? 0 : view.pointerY, 2.2, dt);

    if (view.closer) {
        // up close the pointer pans across the surface instead
        const { artX, artY, artW, artH } = view.closer;
        targetX = lookX = artX + view.driftX * artW * 0.2;
        targetY = lookY = artY - view.driftY * artH * 0.2;
        targetZ = gallery.closeDistance(view.closer);
    } else {
        targetX += view.driftX * 0.42;
        targetY += -view.driftY * 0.14 + 0.1;
    }

    view.x = damp(view.x, targetX, 3, dt);
    view.y = damp(view.y, targetY, 3, dt);
    view.z = damp(view.z, targetZ, 2.4, dt);
    view.lookX = damp(view.lookX, lookX, 3.4, dt);
    view.lookY = damp(view.lookY, lookY, 3, dt);

    camera.position.set(view.x, view.y, view.z);
    camera.lookAt(view.lookX, view.lookY, 0);

    gallery.render(time, view.x);

    // on a struggling GPU, trade sharpness for smoothness once
    slowFrames = dt > 0.03 ? slowFrames + 1 : Math.max(slowFrames - 1, 0);
    if (slowFrames > 60 && !gallery.pixelRatioCap) gallery.lowerQuality();
}

async function start()
{
    buildRoomList();
    // the wall text is drawn to canvas, so the fonts have to be ready first
    await Promise.all(['400 40px Anton', '400 40px Newsreader', 'italic 400 40px Newsreader'].map((font) => document.fonts.load(font)));
    await document.fonts.ready;

    requestAnimationFrame(frame);
    enterRoom(0);
}

start();
