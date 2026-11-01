// The room itself: one long wall, a floor, and bays of art hung along it.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import {
    LAMPS, SHADOWS, shared, wallMaterial, plainMaterial, frameMaterial, textMaterial,
    artMaterial, setArtTexture, floorShader, shareLamps, dustMaterial,
} from './materials.js';
import { pieceText, introText, nextRoomText } from './walltext.js';

const EYE_HEIGHT = 1.55;
const LAMP_HEIGHT = 3.28;
const LAMP_REACH = 2.1; // how far the track sits out from the wall
const TEXT_WIDTH = 1.7;
const ART_TEXT_GAP = 0.55;
const BAY_GAP = 2.3;
const NEIGHBOR_LIGHT = 0.2; // the next works stay faintly lit, so you know where to walk

const canGeometry = new THREE.CylinderGeometry(0.05, 0.07, 0.2, 20);
const lensGeometry = new THREE.CircleGeometry(0.058, 20);
const UP = new THREE.Vector3(0, 1, 0);

export class Gallery {
    constructor(canvas, reducedMotion)
    {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        this.renderer.setClearColor(0x050505);
        this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 60);
        this.reducedMotion = reducedMotion;

        this.wall = new THREE.Mesh(new THREE.PlaneGeometry(320, 10), wallMaterial('#333333'));
        this.wall.position.set(60, 5, 0);
        this.scene.add(this.wall);

        this.floor = new Reflector(new THREE.PlaneGeometry(320, 30), {
            shader: floorShader, textureWidth: 960, textureHeight: 540, clipBias: 0.002, multisample: 0,
        });
        shareLamps(this.floor.material);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.set(60, 0, 15);
        this.scene.add(this.floor);

        const rail = new THREE.Mesh(new THREE.BoxGeometry(320, 0.035, 0.05), plainMaterial({ color: '#0d0d0d' }));
        rail.position.set(60, LAMP_HEIGHT + 0.14, LAMP_REACH);
        this.scene.add(rail);
        this.rail = rail;

        this.bays = [];
        this.roomGroup = new THREE.Group();
        this.scene.add(this.roomGroup);

        if (!reducedMotion) this.addDust();
        this.resize();
    }

    addDust()
    {
        const count = 420;
        const positions = new Float32Array(count * 3);
        const seeds = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = Math.random() * 14;
            positions[i * 3 + 1] = Math.random() * 3.3;
            positions[i * 3 + 2] = 0.1 + Math.random() * 2.6;
            seeds[i] = Math.random();
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

        this.dust = new THREE.Points(geometry, dustMaterial(this.renderer.getPixelRatio()));
        this.dust.frustumCulled = false;
        this.scene.add(this.dust);
    }

    get portrait()
    {
        return this.camera.aspect < 0.9;
    }

    resize()
    {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.renderer.setPixelRatio(this.pixelRatioCap ?? Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    lowerQuality()
    {
        this.pixelRatioCap = 1;
        this.resize();
    }

    // Everything in a room hangs from here. Called again when a phone is rotated.
    hang(room, pieces, nextRoom)
    {
        this.clearRoom();

        this.room = room;
        this.rail.visible = !this.portrait; // from a phone's distance the track would hang in front of the art
        this.wall.material.uniforms.uAlbedo.value.set(room.wall);
        this.floor.material.uniforms.uFloor.value.set(room.floor);
        shared.uLightColor.value.set(room.light);

        const textWidth = this.portrait ? 2.1 : TEXT_WIDTH;
        let x = 0;

        // the opening wall: the room's name, big, like the first panel of a show
        this.bays.push(this.hangPanel(x, introText(room, pieces.length, this.portrait ? 2.2 : 2.5), { intro: true }));
        x += (this.portrait ? 2.2 : 2.5) / 2 + BAY_GAP;

        pieces.forEach((piece, i) => {
            const bay = this.hangPiece(piece, x, i, textWidth);
            this.bays.push(bay);
            x = bay.right + BAY_GAP;
        });

        const panel = nextRoomText(nextRoom, 1.9);
        this.bays.push(this.hangPanel(x + 0.95, panel, { nextRoom }));
    }

    hangPiece(piece, left, index, textWidth)
    {
        const texture = piece.texture;
        const aspect = texture.image.width / texture.image.height;
        const portrait = this.portrait;

        // fit inside the space a person could comfortably look at from here
        const boxW = portrait ? 2.1 : 2.6;
        const boxH = portrait ? 1.7 : 2.15;
        const artH = Math.min(boxH, boxW / aspect);
        const artW = artH * aspect;

        const text = pieceText(piece, textWidth);
        const textOnLeft = index % 2 === 1; // alternate so the walk has a rhythm

        let artX, artY, textX, textY, stop, right;

        if (portrait) {
            const artBottom = 2.05;
            artX = left + Math.max(artW, text.width) / 2;
            artY = artBottom + artH / 2;
            textX = left + Math.max(artW, text.width) / 2;
            textY = Math.max(artBottom - 0.2 - text.height / 2, text.height / 2 + 0.1);
            stop = artX;
            right = left + Math.max(artW, text.width);
        } else {
            artY = EYE_HEIGHT + 0.08;
            textY = Math.max(artY + artH / 2 - text.height / 2, text.height / 2 + 0.28);
            artX = left + (textOnLeft ? text.width + ART_TEXT_GAP : 0) + artW / 2;
            textX = left + (textOnLeft ? text.width / 2 : artW + ART_TEXT_GAP + text.width / 2);
            right = left + artW + ART_TEXT_GAP + text.width;
            stop = (left + right) / 2;
        }

        const group = new THREE.Group();
        const style = this.room.frame;

        const { outerW, outerH } = this.addFrame(group, artW, artH, artX, artY, style);

        const material = artMaterial(texture, style === 'gilt' ? 1.1 : 0);
        const art = new THREE.Mesh(new THREE.PlaneGeometry(artW, artH), material);
        art.position.set(artX, artY, 0.05);
        group.add(art);

        const textMesh = this.addText(group, text, textX, textY);
        this.roomGroup.add(group);

        const bay = {
            kind: 'piece', piece, art, textMesh, x: stop, right,
            artX, artY, artW, artH, lit: 0, textLit: 0,
            shadow: new THREE.Vector4(artX, artY, outerW / 2, outerH / 2),
            lamps: [
                this.addLamp(group, artX, artY, Math.hypot(outerW, outerH) / 2, 1),
                this.addLamp(group, textX, textY, Math.max(text.width, text.height) * 0.6, 0.5),
            ],
        };
        art.userData.bay = bay;
        return bay;
    }

    hangPanel(x, text, { intro = false, nextRoom = null })
    {
        const group = new THREE.Group();
        const y = Math.max(EYE_HEIGHT, text.height / 2 + 0.3);
        const textMesh = this.addText(group, text, x, y);
        this.roomGroup.add(group);

        const bay = {
            kind: intro ? 'intro' : 'next', nextRoom, textMesh, x, right: x + text.width / 2,
            lit: 0, textLit: 0, shadow: null,
            lamps: [
                this.addLamp(group, x, y, Math.max(text.width, text.height) * 0.72, 0.6),
            ],
        };
        textMesh.userData.bay = bay;
        return bay;
    }

    addText(group, text, x, y)
    {
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(text.width, text.height),
            textMaterial(text.texture, this.room.type),
        );
        mesh.position.set(x, y, 0.004);
        group.add(mesh);
        return mesh;
    }

    addFrame(group, artW, artH, x, y, style)
    {
        const mount = style === 'paper' ? Math.min(artW, artH) * 0.085 : 0;
        const width = style === 'gilt' ? 0.075 : 0.03;
        const innerW = artW + mount * 2;
        const innerH = artH + mount * 2;
        const outerW = innerW + width * 2;
        const outerH = innerH + width * 2;

        const shape = new THREE.Shape();
        shape.moveTo(-outerW / 2, -outerH / 2);
        shape.lineTo(outerW / 2, -outerH / 2);
        shape.lineTo(outerW / 2, outerH / 2);
        shape.lineTo(-outerW / 2, outerH / 2);
        shape.closePath();

        const hole = new THREE.Path();
        hole.moveTo(-innerW / 2, -innerH / 2);
        hole.lineTo(-innerW / 2, innerH / 2);
        hole.lineTo(innerW / 2, innerH / 2);
        hole.lineTo(innerW / 2, -innerH / 2);
        hole.closePath();
        shape.holes.push(hole);

        const bevel = style === 'gilt' ? 0.03 : 0.004;
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: style === 'gilt' ? 0.04 : 0.06, bevelEnabled: true, bevelSize: bevel, bevelThickness: style === 'gilt' ? 0.05 : bevel, bevelSegments: 4,
        });

        const look = {
            gilt: { color: '#8f6c34', spec: 0.32, shine: 18 },
            slim: { color: '#6d4a2e', spec: 0.25, shine: 40 },
            paper: { color: '#121212', spec: 0.3, shine: 60 },
        }[style];

        const frame = new THREE.Mesh(geometry, frameMaterial(look));
        frame.position.set(x, y, 0.012);
        group.add(frame);

        if (mount > 0) {
            const paper = new THREE.Mesh(new THREE.PlaneGeometry(innerW, innerH), plainMaterial({ color: '#c9c3b5' }));
            paper.position.set(x, y, 0.044);
            group.add(paper);
        }

        return { outerW: outerW + bevel * 2, outerH: outerH + bevel * 2 };
    }

    // A lamp on the track, aimed at (x, y) on the wall. Bright enough to light that point at full strength.
    addLamp(group, x, y, radius, strength)
    {
        const pos = new THREE.Vector3(x, LAMP_HEIGHT, LAMP_REACH);
        const target = new THREE.Vector3(x, y, 0);
        const toTarget = target.clone().sub(pos);
        const dist = toTarget.length();
        const dir = toTarget.clone().normalize();
        const facing = dir.dot(new THREE.Vector3(0, 0, -1));

        const can = new THREE.Mesh(canGeometry, plainMaterial({ color: '#141414', spec: 0.2 }));
        can.position.copy(pos);
        can.quaternion.setFromUnitVectors(UP, dir.clone().negate());

        const lensMaterial = plainMaterial({ color: '#fff0d6', emissive: 0 });
        const lens = new THREE.Mesh(lensGeometry, lensMaterial);
        lens.position.copy(pos).addScaledVector(dir, 0.102);
        lens.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().negate());

        if (!this.portrait) group.add(can, lens);

        return {
            pos,
            dir,
            cosInner: Math.cos(Math.atan(radius / dist)),
            cosOuter: Math.cos(Math.atan((radius * 1.5) / dist)),
            power: (strength * dist * dist) / facing,
            lens: lensMaterial,
        };
    }

    clearRoom()
    {
        this.roomGroup.traverse((object) => {
            if (object.geometry && object.geometry !== canGeometry && object.geometry !== lensGeometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                const map = object.material.uniforms?.uMap?.value;
                // text textures are made per hang; art textures belong to the room's pieces
                if (map && object.material.defines.TEXT) map.dispose();
                object.material.dispose();
            }
        });
        this.roomGroup.clear();
        this.bays = [];
    }

    // How far back to stand so a whole bay fits on screen.
    viewDistance()
    {
        const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
        const needW = this.portrait ? 2.75 : 6.5;
        return Math.max(needW / (2 * tan * this.camera.aspect), 6.5);
    }

    closeDistance(bay)
    {
        const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
        const fitH = (bay.artH * 1.12) / (2 * tan);
        const fitW = (bay.artW * 1.12) / (2 * tan * this.camera.aspect);
        return Math.max(fitH, fitW, 1.4);
    }

    // Push the lamps of the bays nearest `index` to the shaders.
    updateLamps(index, master)
    {
        const nearby = [index - 1, index, index + 1].map((i) => this.bays[i]);
        let slot = 0;
        let shadowSlot = 0;

        for (const bay of nearby) {
            if (!bay) continue;
            if (bay.shadow) shared.uShadow.value[shadowSlot++].copy(bay.shadow);

            bay.lamps.forEach((lamp, i) => {
                const isTextLamp = bay.kind === 'piece' ? i === 1 : true;
                const level = (isTextLamp ? bay.textLit : bay.lit) * master;

                shared.uLampPos.value[slot].copy(lamp.pos);
                shared.uLampDir.value[slot].copy(lamp.dir);
                shared.uLampCone.value[slot].set(lamp.cosInner, lamp.cosOuter, lamp.power * level);
                lamp.lens.uniforms.uEmissive.value = level * 6;
                slot++;
            });

            bay.textMesh.material.uniforms.uEmissive.value = bay.textLit * master * 0.38;
        }

        for (; slot < LAMPS; slot++) shared.uLampCone.value[slot].z = 0;
        for (; shadowSlot < SHADOWS; shadowSlot++) shared.uShadow.value[shadowSlot].z = 0;
    }

    setLit(index, dt)
    {
        const rate = (target, current) => (target > current ? 3.2 : 5); // lamps warm up, and cut out quicker

        this.bays.forEach((bay, i) => {
            const isCurrent = i === index;
            const artTarget = isCurrent ? 1 : NEIGHBOR_LIGHT;
            const textTarget = isCurrent ? 1 : 0;
            bay.lit += (artTarget - bay.lit) * (1 - Math.exp(-rate(artTarget, bay.lit) * dt));
            // the text answers a beat after the art, so the eye lands on the work first
            if (bay.lit > 0.55 || !isCurrent) {
                bay.textLit += (textTarget - bay.textLit) * (1 - Math.exp(-rate(textTarget, bay.textLit) * 0.8 * dt));
            }
        });
    }

    setHighRes(bay, texture)
    {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = this.maxAnisotropy;
        setArtTexture(bay.art.material, texture);
        bay.piece.highRes = texture;
    }

    pick(raycaster)
    {
        const targets = this.bays.map((bay) => bay.art || (bay.kind === 'next' ? bay.textMesh : null)).filter(Boolean);
        return raycaster.intersectObjects(targets, false)[0]?.object.userData.bay ?? null;
    }

    render(time, centerX)
    {
        shared.uTime.value = time;
        if (this.dust) this.dust.material.uniforms.uCenterX.value = centerX;
        this.renderer.render(this.scene, this.camera);
    }
}

export { EYE_HEIGHT };
