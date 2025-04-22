import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.139.2/three.module.js';

let gameStarted = false;
let gameOver = false;
let gameWon = false;
let isPaused = false;
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const characterSelectScreen = document.getElementById('characterSelectScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const gameWonScreen = document.getElementById('gameWonScreen');
const restartButton = document.getElementById('restartButton');
const playAgainButton = document.getElementById('playAgainButton');
const instructionsDiv = document.getElementById('instructions');
const levelIndicator = document.getElementById('levelIndicator');
const levelNumberSpan = document.getElementById('levelNumber');
let isPointerLocked = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x606060);
scene.add(ambientLight);

const lightPositionX = -1;
const lightPositionY = 1.5;
const lightPositionZ = 1;
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(lightPositionX, lightPositionY, lightPositionZ).normalize().multiplyScalar(120);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 250;
const shadowCamSize = 80;
directionalLight.shadow.camera.left = -shadowCamSize;
directionalLight.shadow.camera.right = shadowCamSize;
directionalLight.shadow.camera.top = shadowCamSize;
directionalLight.shadow.camera.bottom = -shadowCamSize;
directionalLight.shadow.bias = -0.001;
scene.add(directionalLight);

const textureLoader = new THREE.TextureLoader();
const grassTexture = textureLoader.load('textures/grass.jpg');
const stoneTexture = textureLoader.load('textures/stone.jpg');

grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;
stoneTexture.wrapS = THREE.RepeatWrapping;
stoneTexture.wrapT = THREE.RepeatWrapping;

const cubeTextureLoader = new THREE.CubeTextureLoader();
const skyboxTexture = cubeTextureLoader
    .setPath('textures/skybox/')
    .load([
        'Daylight Box_Right.bmp', 'Daylight Box_Left.bmp',
        'Daylight Box_Top.bmp', 'Daylight Box_Bottom.bmp',
        'Daylight Box_Front.bmp', 'Daylight Box_Back.bmp'
    ]);
scene.background = skyboxTexture;

const wallSize = 5;
const wallHeight = 5;
let mazeRows, mazeCols;
let mazeWidth, mazeDepth;
let mazeCenterX, mazeCenterZ;
const walls = [];
const wallBoxes = [];
const wallMeshes = [];
const hintTiles = [];
const hintTileBoxes = [];

let floorMesh;
let winPlateMesh;
let winPlateBox;

let hintCamera;
let isShowingHint = false;
let hintStartTime = 0;
const hintDuration = 4.0;
let originalCameraPosition = new THREE.Vector3();
let originalCameraRotation = new THREE.Euler();
let playerMarkerMesh = null;
const playerMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 });
const playerMarkerGeometry = new THREE.SphereGeometry(0.5, 16, 8);

let hintCamStartPos = new THREE.Vector3();
let hintCamEndPos = new THREE.Vector3();
let hintCamStartLookAt = new THREE.Vector3();
let hintCamEndLookAt = new THREE.Vector3();
let hintCamCurrentLookAt = new THREE.Vector3();


const mazeLayouts = [
    [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 3, 0, 0, 1, 0, 0, 0, 5, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1],
        [1, 1, 1, 1, 0, 1, 1, 0, 1, 4, 1, 1],
        [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1],
        [1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 2, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 3, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 4, 1],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 1, 5, 0, 1, 1, 0, 1, 0, 1],
        [1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1],
        [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1],
        [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1],
        [1, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 3, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
        [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
        [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 1, 0, 1, 4, 0, 0, 1, 0, 1, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1],
        [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
        [1, 5, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]
];
let currentLevel = 0;

const wallMaterial = new THREE.MeshStandardMaterial({ map: stoneTexture });
const floorMaterial = new THREE.MeshStandardMaterial({ map: grassTexture, side: THREE.DoubleSide });
const winPlateMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const hintTileMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });

const wallGeometry = new THREE.BoxGeometry(wallSize, wallHeight, wallSize);
const winPlateGeometry = new THREE.CylinderGeometry(wallSize * 0.4, wallSize * 0.4, 0.2, 32);
const hintTileGeometry = new THREE.CylinderGeometry(wallSize * 0.35, wallSize * 0.35, 0.2, 32);

camera.rotation.order = 'YXZ';

function setupLevel(levelIndex) {
    walls.length = 0;
    wallBoxes.length = 0;
    hintTiles.length = 0;
    hintTileBoxes.length = 0;
    wallMeshes.forEach(mesh => scene.remove(mesh));
    wallMeshes.length = 0;
    if (floorMesh) scene.remove(floorMesh);
    if (winPlateMesh) scene.remove(winPlateMesh);
    hintTiles.forEach(tile => scene.remove(tile.mesh));
    if (playerMarkerMesh) {
        scene.remove(playerMarkerMesh);
        playerMarkerMesh = null;
    }

    isShowingHint = false;

    const currentLayout = mazeLayouts[levelIndex];
    mazeRows = currentLayout.length;
    mazeCols = currentLayout[0].length;
    let playerStartPos = null;
    let chaserStartPos = null;
    let winPos = null;

    mazeWidth = mazeCols * wallSize;
    mazeDepth = mazeRows * wallSize;
    mazeCenterX = (mazeCols / 2) * wallSize - wallSize / 2;
    mazeCenterZ = (mazeRows / 2) * wallSize - wallSize / 2;

    for (let row = 0; row < mazeRows; row++) {
        for (let col = 0; col < mazeCols; col++) {
            const worldPos = gridToWorld(row, col);
            switch (currentLayout[row][col]) {
                case 1:
                    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                    wallMesh.position.set(worldPos.x, wallHeight / 2, worldPos.z);
                    wallMesh.castShadow = true;
                    wallMesh.receiveShadow = true;
                    scene.add(wallMesh);
                    walls.push(wallMesh);
                    wallMeshes.push(wallMesh);
                    const box = new THREE.Box3().setFromObject(wallMesh);
                    box.min.y -= 0.1;
                    wallBoxes.push(box);
                    break;
                case 2:
                    winPos = worldPos;
                    break;
                case 3:
                    playerStartPos = worldPos;
                    break;
                case 4:
                    chaserStartPos = worldPos;
                    break;
                case 5:
                    const hintTileMesh = new THREE.Mesh(hintTileGeometry, hintTileMaterial);
                    hintTileMesh.position.set(worldPos.x, 0.1, worldPos.z);
                    hintTileMesh.receiveShadow = false;
                    hintTileMesh.castShadow = false;
                    scene.add(hintTileMesh);
                    const hintTileBox = new THREE.Box3().setFromObject(hintTileMesh);
                    hintTileBox.expandByScalar(0.1);
                    const hintTileData = { mesh: hintTileMesh, box: hintTileBox, active: true };
                    hintTiles.push(hintTileData);
                    hintTileBoxes.push(hintTileData);
                    break;
            }
        }
    }


    grassTexture.repeat.set(mazeCols, mazeRows);
    const floorGeometry = new THREE.PlaneGeometry(mazeWidth, mazeDepth);
    floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.position.x = mazeCenterX;
    floorMesh.position.z = mazeCenterZ;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    if (winPos) {
        winPlateMesh = new THREE.Mesh(winPlateGeometry, winPlateMaterial);
        winPlateMesh.position.set(winPos.x, 0.1, winPos.z);
        winPlateMesh.receiveShadow = false;
        winPlateMesh.castShadow = false;
        scene.add(winPlateMesh);
        winPlateBox = new THREE.Box3().setFromObject(winPlateMesh);
        winPlateBox.expandByScalar(0.1);
    } else {
        winPlateMesh = null;
        winPlateBox = null;
    }

    if (playerStartPos) {
        camera.position.set(playerStartPos.x, playerHeight, playerStartPos.z);
        camera.rotation.set(0, Math.PI, 0);
    } else {
        camera.position.set(wallSize, playerHeight, wallSize);
         camera.rotation.set(0, Math.PI, 0);
    }
    playerVelocityY = 0;
    onGround = true;

    if (chaserStartPos) {
        chaserMesh.position.set(chaserStartPos.x, chaserRadius, chaserStartPos.z);
    } else {
        let fallbackChaserPos = gridToWorld(mazeRows - 2, mazeCols - 2);
         if (currentLayout[mazeRows - 2]?.[mazeCols - 2] !== 0 || (playerStartPos && fallbackChaserPos.distanceToSquared(playerStartPos) < (wallSize*3)**2)) {
             findFallbackChaser:
             for (let r = mazeRows - 2; r > 0; r--) {
                 for (let c = mazeCols - 2; c > 0; c--) {
                     if (currentLayout[r]?.[c] === 0) {
                        const potentialPos = gridToWorld(r, c);
                        if (!playerStartPos || potentialPos.distanceToSquared(playerStartPos) > (wallSize*5)**2) {
                             fallbackChaserPos = potentialPos;
                             break findFallbackChaser;
                        }
                     }
                 }
             }
         }
        chaserMesh.position.set(fallbackChaserPos.x, chaserRadius, fallbackChaserPos.z);
    }
    chaserCollider.center.copy(chaserMesh.position);
    chaserPath = [];
    currentPathIndex = 0;
    timeSinceLastPathRecalc = pathRecalcInterval;
    lastPathPlayerGrid = null;

    levelNumberSpan.textContent = levelIndex + 1;
    levelIndicator.style.display = 'block';

    hintCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);


    gameOver = false;
    gameWon = false;
}

const playerHeight = 2;
const playerRadius = 0.4;
const mouseSensitivity = 0.002;
const gravity = 20.0;
let playerVelocityY = 0;
let onGround = true;

let selectedMoveSpeed = 5.0;
let selectedJumpStrength = 5.0;
const characterStats = {
    average: { speed: 6.0, jump: 6.0 },
    speedster: { speed: 7.5, jump: 4.0 },
    jumper: { speed: 5.8, jump: 10 },
};

const chaserRadius = 1;
const chaserSpeed = 6.5;
const chaserGeometry = new THREE.SphereGeometry(chaserRadius, 16, 16);
const chaserMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const chaserMesh = new THREE.Mesh(chaserGeometry, chaserMaterial);
chaserMesh.castShadow = true;
chaserMesh.receiveShadow = false;
const chaserCollider = new THREE.Sphere(undefined, chaserRadius);
scene.add(chaserMesh);

let chaserPath = [];
let currentPathIndex = 0;
let timeSinceLastPathRecalc = 0;
const pathRecalcInterval = 1.0;
let lastPathPlayerGrid = null;
const directChaseDistanceThresholdSq = (wallSize * 2.5) * (wallSize * 2.5);
const veryCloseDistanceSq = (wallSize * 0.5) * (wallSize * 0.5);
const raycaster = new THREE.Raycaster();
const chaserRayOrigin = new THREE.Vector3();
const chaserRayDirection = new THREE.Vector3();

const keyState = {};
window.addEventListener('keydown', (event) => {
    keyState[event.code] = true;
     if (event.code === 'Space' && onGround && !gameOver && !gameWon && gameStarted && !isPaused && !isShowingHint) {
        playerVelocityY = selectedJumpStrength;
        onGround = false;
    }
     if (event.code === 'Escape' && isPointerLocked && gameStarted && !gameOver && !gameWon && !isShowingHint) {
         document.exitPointerLock();
     }
});
window.addEventListener('keyup', (event) => { keyState[event.code] = false; });

startButton.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    characterSelectScreen.style.display = 'flex';
    requestAnimationFrame(() => {
        characterSelectScreen.classList.add('visible');
    });
    startScreen.addEventListener('transitionend', () => {
        startScreen.style.display = 'none';
    }, { once: true });
});

function startGame(characterType) {
    selectedMoveSpeed = characterStats[characterType].speed;
    selectedJumpStrength = characterStats[characterType].jump;

    characterSelectScreen.classList.remove('visible');
    characterSelectScreen.classList.add('hidden');
    characterSelectScreen.addEventListener('transitionend', () => {
         characterSelectScreen.style.display = 'none';
    }, { once: true });

    currentLevel = 0;
    setupLevel(currentLevel);

    gameStarted = true;
    isPaused = false;
    gameOver = false;
    gameWon = false;
    isShowingHint = false;
    pauseScreen.classList.remove('visible');
    pauseScreen.classList.add('hidden');
    gameOverScreen.style.display = 'none';
    gameWonScreen.style.display = 'none';
    clock.start();
    clock.getDelta();
    if (!isPointerLocked) {
        renderer.domElement.requestPointerLock();
    }
}

document.querySelectorAll('.character-option .selectButton').forEach(button => {
    button.addEventListener('click', (event) => {
        const optionDiv = event.target.closest('.character-option');
        const characterType = optionDiv.dataset.character;
        startGame(characterType);
    });
});

renderer.domElement.addEventListener('click', () => {
    if (!isPointerLocked && gameStarted && !gameOver && !gameWon && !isPaused && !isShowingHint) {
        renderer.domElement.requestPointerLock();
    }
});

pauseScreen.addEventListener('click', () => {
    if (isPaused && !isPointerLocked) {
         renderer.domElement.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    const previouslyPaused = isPaused;
    isPointerLocked = (document.pointerLockElement === renderer.domElement);
    if (isPointerLocked) {
        document.addEventListener('mousemove', onMouseMove, false);
        if (previouslyPaused) {
            resumeGame();
        } else if (gameStarted && !gameOver && !gameWon && !isShowingHint) {
             instructionsDiv.style.display = 'block';
             setTimeout(() => { if(isPointerLocked && !isPaused) instructionsDiv.style.display = 'none'; }, 3000);
             pauseScreen.classList.remove('visible');
             pauseScreen.classList.add('hidden');
        }
    } else {
        document.removeEventListener('mousemove', onMouseMove, false);
        if (gameStarted && !gameOver && !gameWon && !isShowingHint) {
            pauseGame();
        }
    }
}, false);

document.addEventListener('pointerlockerror', (e) => {
    isPointerLocked = false;
    document.removeEventListener('mousemove', onMouseMove, false);
    if (gameStarted && !gameOver && !gameWon && !isPaused && !isShowingHint) {
         pauseGame();
    }
}, false);

function pauseGame() {
    if (!gameStarted || gameOver || gameWon || isPaused || isShowingHint) return;
    isPaused = true;
    pauseScreen.classList.remove('hidden');
    pauseScreen.style.display = 'flex';
    requestAnimationFrame(() => {
        pauseScreen.classList.add('visible');
    });
    instructionsDiv.style.display = 'none';
    clock.stop();
}

function resumeGame() {
     if (!isPaused) return;
     isPaused = false;
     pauseScreen.classList.remove('visible');
     pauseScreen.classList.add('hidden');
      pauseScreen.addEventListener('transitionend', () => {
          pauseScreen.style.display = 'none';
      }, { once: true });

     instructionsDiv.style.display = 'block';
     setTimeout(() => { if(isPointerLocked && !isPaused) instructionsDiv.style.display = 'none'; }, 3000);
     clock.start();
     clock.getDelta();
}

function onMouseMove(event) {
    if (!isPointerLocked || gameOver || gameWon || !gameStarted || isPaused || isShowingHint) return;
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    camera.rotation.y -= movementX * mouseSensitivity;
    camera.rotation.x -= movementY * mouseSensitivity;
    camera.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camera.rotation.x));
    camera.rotation.z = 0;
}

const playerCollider = new THREE.Box3();
const playerWidth = playerRadius * 2;
const playerVisualHeight = 1.7;
const playerSizeVec = new THREE.Vector3(playerWidth, playerVisualHeight, playerWidth);

function checkPlayerWallCollision(moveDirection) {
    const checkHeight = playerVisualHeight * 0.9;
    const checkCenterY = camera.position.y - playerHeight + (checkHeight / 2);

    const checkPosition = camera.position.clone().add(moveDirection);
    checkPosition.y = checkCenterY;
    playerCollider.setFromCenterAndSize(checkPosition, new THREE.Vector3(playerWidth, checkHeight, playerWidth));

    for (const wallBox of wallBoxes) {
        if (playerCollider.intersectsBox(wallBox)) return true;
    }
    return false;
}

function checkPlayerWinCollision() {
    if (!winPlateBox) return false;
    const playerFeetPos = camera.position.clone();
    playerFeetPos.y = 0.1;
    const playerFeetCollider = new THREE.Box3().setFromCenterAndSize(
        playerFeetPos,
        new THREE.Vector3(playerRadius, 0.2, playerRadius)
    );
    return playerFeetCollider.intersectsBox(winPlateBox);
}

function checkPlayerHintCollision() {
    const playerFeetPos = camera.position.clone();
    playerFeetPos.y = 0.1;
    const playerFeetCollider = new THREE.Box3().setFromCenterAndSize(
        playerFeetPos,
        new THREE.Vector3(playerRadius, 0.2, playerRadius)
    );

    for (let i = 0; i < hintTileBoxes.length; i++) {
        const hintTileData = hintTileBoxes[i];
        if (hintTileData.active && playerFeetCollider.intersectsBox(hintTileData.box)) {
            return hintTileData;
        }
    }
    return null;
}

function checkChaserWallCollisionWithMove(currentPos, moveVec) {
    const nextPos = currentPos.clone().add(moveVec);
    chaserCollider.center.copy(nextPos);
    chaserCollider.center.y = chaserRadius;

    for (const wallBox of wallBoxes) {
        if (chaserCollider.intersectsBox(wallBox) && (chaserCollider.center.y + chaserCollider.radius) > wallBox.min.y + 0.1) {
            return true;
        }
    }
    return false;
}


function gridToWorld(row, col) {
    return new THREE.Vector3(col * wallSize, 0, row * wallSize);
}

function worldToGrid(worldPos) {
    const col = Math.round(worldPos.x / wallSize);
    const row = Math.round(worldPos.z / wallSize);
    return {
         row: Math.max(0, Math.min(mazeRows - 1, row)),
         col: Math.max(0, Math.min(mazeCols - 1, col))
    };
}

class PathNode {
    constructor(row, col, g = Infinity, h = 0, parent = null) {
        this.row = row; this.col = col; this.g = g; this.h = h;
        this.f = g + h; this.parent = parent;
    }
 }

function heuristic(nodeA, nodeB) {
    return Math.abs(nodeA.row - nodeB.row) + Math.abs(nodeA.col - nodeB.col);
}

function findPath(startWorldPos, endWorldPos) {
    const currentLayout = mazeLayouts[currentLevel];
    const startGrid = worldToGrid(startWorldPos);
    const endGrid = worldToGrid(endWorldPos);

    if (startGrid.row === endGrid.row && startGrid.col === endGrid.col) return [];
    if (currentLayout[startGrid.row]?.[startGrid.col] === 1 ||
        currentLayout[endGrid.row]?.[endGrid.col] === 1) {
         return [];
    }

    const openSet = new Map();
    const closedSet = new Set();
    const startNode = new PathNode(startGrid.row, startGrid.col, 0);
    startNode.h = heuristic(startNode, endGrid); startNode.f = startNode.g + startNode.h;
    const startKey = `${startGrid.row},${startGrid.col}`; openSet.set(startKey, startNode);

    let iterations = 0;
    const maxIterations = mazeRows * mazeCols * 1.5;

    while (openSet.size > 0 && iterations < maxIterations) {
        iterations++;
        let lowestF = Infinity; let currentKey = null; let currentNode = null;
        for (const [key, node] of openSet) {
            if (node.f < lowestF) {
                lowestF = node.f; currentKey = key; currentNode = node;
            }
        }

        if (!currentNode) break;

        if (currentNode.row === endGrid.row && currentNode.col === endGrid.col) {
            const path = []; let temp = currentNode;
            while (temp) {
                const worldP = gridToWorld(temp.row, temp.col);
                worldP.y = chaserRadius;
                path.push(worldP);
                temp = temp.parent;
            }
            return path.reverse();
        }

        openSet.delete(currentKey);
        closedSet.add(currentKey);

        const neighbors = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 } ];
        for (const move of neighbors) {
            const nRow = currentNode.row + move.dr; const nCol = currentNode.col + move.dc;
            const nKey = `${nRow},${nCol}`;

            if (nRow < 0 || nRow >= mazeRows || nCol < 0 || nCol >= mazeCols) continue;
            if (currentLayout[nRow]?.[nCol] === 1) continue;
            if (closedSet.has(nKey)) continue;

            const tentativeG = currentNode.g + 1;
            let nNode = openSet.get(nKey);

            if (!nNode || tentativeG < nNode.g) {
                if (!nNode) {
                    nNode = new PathNode(nRow, nCol);
                    openSet.set(nKey, nNode);
                }
                nNode.parent = currentNode;
                nNode.g = tentativeG;
                nNode.h = heuristic(nNode, endGrid);
                nNode.f = nNode.g + nNode.h;
            }
        }
    }
    return [];
}


function hasLineOfSight(startPos, endPos) {
    chaserRayOrigin.copy(startPos);
    chaserRayOrigin.y = chaserRadius;

    chaserRayDirection.copy(endPos).sub(chaserRayOrigin);
    const distance = chaserRayDirection.length();

    if (distance < 0.1) return true;

    chaserRayDirection.normalize();

    raycaster.set(chaserRayOrigin, chaserRayDirection);
    raycaster.far = distance;
    const intersects = raycaster.intersectObjects(wallMeshes);

    for (let i = 0; i < intersects.length; i++) {
        if (intersects[i].distance > 0.1 && intersects[i].distance < distance - 0.1) {
            return false;
        }
    }
    return true;
}


function triggerGameOver() {
    if (gameOver || gameWon) return;
    gameOver = true;
    gameStarted = false;
    isPaused = false;
    clock.stop();
    gameOverScreen.style.display = 'flex';
    instructionsDiv.style.display = 'none';
    levelIndicator.style.display = 'none';
    pauseScreen.classList.remove('visible');
    pauseScreen.classList.add('hidden');
    pauseScreen.style.display = 'none';
    if (playerMarkerMesh) {
        scene.remove(playerMarkerMesh);
        playerMarkerMesh = null;
    }
    if (isPointerLocked) document.exitPointerLock();
}

function triggerLevelComplete() {
    if (gameOver || gameWon) return;
    if (playerMarkerMesh) {
        scene.remove(playerMarkerMesh);
        playerMarkerMesh = null;
    }
    currentLevel++;
    if (currentLevel >= mazeLayouts.length) {
        triggerGameWon();
    } else {
        setupLevel(currentLevel);
        instructionsDiv.style.display = 'block';
        setTimeout(() => { if(isPointerLocked && !isPaused) instructionsDiv.style.display = 'none'; }, 3000);
    }
}

function triggerGameWon() {
    if (gameOver || gameWon) return;
    gameWon = true;
    gameStarted = false;
    isPaused = false;
    clock.stop();
    gameWonScreen.style.display = 'flex';
    instructionsDiv.style.display = 'none';
    levelIndicator.style.display = 'none';
    pauseScreen.classList.remove('visible');
    pauseScreen.classList.add('hidden');
    pauseScreen.style.display = 'none';
     if (playerMarkerMesh) {
        scene.remove(playerMarkerMesh);
        playerMarkerMesh = null;
    }
    if (isPointerLocked) document.exitPointerLock();
}

restartButton.addEventListener('click', () => window.location.reload());
playAgainButton.addEventListener('click', () => window.location.reload());

const clock = new THREE.Clock(false);
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const playerMoveDirection = new THREE.Vector3();
const chaserTargetPoint = new THREE.Vector3();
const chaserDirectionTarget = new THREE.Vector3();
const chaserMoveDir = new THREE.Vector3();
const targetReachedThresholdSq = 0.3 * 0.3;
const tempChaserPos = new THREE.Vector3();
const tempPlayerPos = new THREE.Vector3();
const tempTargetPos = new THREE.Vector3();
const tempVec = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (isShowingHint) {
        const hintElapsedTime = elapsedTime - hintStartTime;
        const progress = Math.min(hintElapsedTime / hintDuration, 1.0);

        hintCamera.position.lerpVectors(hintCamStartPos, hintCamEndPos, progress);
        hintCamCurrentLookAt.lerpVectors(hintCamStartLookAt, hintCamEndLookAt, progress);
        hintCamera.lookAt(hintCamCurrentLookAt);
        hintCamera.updateProjectionMatrix();

        if (playerMarkerMesh) {
             playerMarkerMesh.material.opacity = 1.0 - progress * 0.75;
        }


        renderer.render(scene, hintCamera);

        if (hintElapsedTime >= hintDuration) {
            isShowingHint = false;
            camera.position.copy(originalCameraPosition);
            camera.rotation.copy(originalCameraRotation);
            camera.updateProjectionMatrix();
            if (playerMarkerMesh) {
                scene.remove(playerMarkerMesh);
                playerMarkerMesh = null;
            }
             if (!isPointerLocked && gameStarted && !gameOver && !gameWon && !isPaused) {
                 renderer.domElement.requestPointerLock();
             }
        }
        return;
    }


    if (!gameStarted || gameOver || gameWon || isPaused || !clock.running) {
         renderer.render(scene, camera);
         return;
    }

    const clampedDelta = Math.min(delta, 0.05);
    timeSinceLastPathRecalc += clampedDelta;

    playerMoveDirection.set(0, 0, 0);
    const moveDistance = selectedMoveSpeed * clampedDelta;
    camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
    right.crossVectors(camera.up, forward).normalize();

    if (keyState['KeyW'] || keyState['ArrowUp']) playerMoveDirection.add(forward);
    if (keyState['KeyS'] || keyState['ArrowDown']) playerMoveDirection.sub(forward);
    if (keyState['KeyA'] || keyState['ArrowLeft']) playerMoveDirection.add(right);
    if (keyState['KeyD'] || keyState['ArrowRight']) playerMoveDirection.sub(right);

    if (playerMoveDirection.lengthSq() > 0) {
        playerMoveDirection.normalize().multiplyScalar(moveDistance);
    }

    const combinedMove = playerMoveDirection.clone();
    if (combinedMove.lengthSq() > 0) {
        if (!checkPlayerWallCollision(combinedMove)) {
            camera.position.add(combinedMove);
        } else {
            const moveX = new THREE.Vector3(combinedMove.x, 0, 0);
            const moveZ = new THREE.Vector3(0, 0, combinedMove.z);
            if (moveX.lengthSq() > 0.0001 && !checkPlayerWallCollision(moveX)) {
                 camera.position.add(moveX);
            }
            if (moveZ.lengthSq() > 0.0001 && !checkPlayerWallCollision(moveZ)) {
                camera.position.add(moveZ);
            }
        }
    }

    playerVelocityY -= gravity * clampedDelta;
    camera.position.y += playerVelocityY * clampedDelta;

    if (camera.position.y <= playerHeight) {
        camera.position.y = playerHeight;
        playerVelocityY = 0;
        onGround = true;
    } else {
        onGround = false;
    }

    const collidedHintTileData = checkPlayerHintCollision();
    if (collidedHintTileData) {
        isShowingHint = true;
        hintStartTime = elapsedTime;
        originalCameraPosition.copy(camera.position);
        originalCameraRotation.copy(camera.rotation);

        if (playerMarkerMesh) scene.remove(playerMarkerMesh);
        playerMarkerMesh = new THREE.Mesh(playerMarkerGeometry, playerMarkerMaterial.clone());
        playerMarkerMesh.position.set(camera.position.x, playerHeight + 0.1, camera.position.z);
        scene.add(playerMarkerMesh);

        const playerDir = camera.getWorldDirection(tempVec);
        hintCamStartPos.copy(camera.position).add(playerDir.multiplyScalar(-8)).add(new THREE.Vector3(0, 5, 0));
        hintCamEndPos.set(mazeCenterX, Math.max(mazeWidth, mazeDepth) * 1.5, mazeCenterZ + Math.max(mazeWidth, mazeDepth) * 0.5); // High angle end pos
        hintCamStartLookAt.copy(playerMarkerMesh.position);
        hintCamEndLookAt.set(mazeCenterX, 0, mazeCenterZ);

        hintCamera.position.copy(hintCamStartPos);
        hintCamCurrentLookAt.copy(hintCamStartLookAt);
        hintCamera.lookAt(hintCamCurrentLookAt);
        hintCamera.updateProjectionMatrix();


        collidedHintTileData.active = false;
        scene.remove(collidedHintTileData.mesh);
        const index = hintTileBoxes.indexOf(collidedHintTileData);
        if (index > -1) {
            hintTileBoxes.splice(index, 1);
        }

        if (isPointerLocked) {
             document.exitPointerLock();
        }

        renderer.render(scene, hintCamera);
        return;
    }


    if (checkPlayerWinCollision()) {
        triggerLevelComplete();
        renderer.render(scene, camera);
        return;
    }

    tempChaserPos.copy(chaserMesh.position);
    tempPlayerPos.copy(camera.position);
    const distanceToPlayerSq = tempChaserPos.distanceToSquared(tempPlayerPos);
    let useDirectChase = false;
    let needsNewPath = false;
    const currentLayout = mazeLayouts[currentLevel];
    const playerGrid = worldToGrid(tempPlayerPos);

    const hasLOS = hasLineOfSight(tempChaserPos, tempPlayerPos);

    if (distanceToPlayerSq < directChaseDistanceThresholdSq && hasLOS) {
        useDirectChase = true;
        if (chaserPath.length > 0) {
             chaserPath = [];
        }
        currentPathIndex = 0;
        lastPathPlayerGrid = null;
    } else {
        useDirectChase = false;
        tempTargetPos.copy(tempPlayerPos);
        tempTargetPos.y = chaserRadius;

        needsNewPath = false;
        if (chaserPath.length === 0 && distanceToPlayerSq > veryCloseDistanceSq) {
             needsNewPath = true;
        } else if (timeSinceLastPathRecalc > pathRecalcInterval && distanceToPlayerSq > veryCloseDistanceSq) {
             const targetGrid = worldToGrid(tempTargetPos);
             if (!lastPathPlayerGrid || lastPathPlayerGrid.row !== targetGrid.row || lastPathPlayerGrid.col !== targetGrid.col) {
                 needsNewPath = true;
             } else {
                 timeSinceLastPathRecalc = 0;
             }
        } else if (chaserPath.length > 0) {
             const pathEndGrid = worldToGrid(chaserPath[chaserPath.length - 1]);
             const targetGrid = worldToGrid(tempTargetPos);
             if (Math.abs(pathEndGrid.row - targetGrid.row) > 1 || Math.abs(pathEndGrid.col - targetGrid.col) > 1) {
                 needsNewPath = true;
             }
             if (currentPathIndex >= chaserPath.length && distanceToPlayerSq > veryCloseDistanceSq) {
                 needsNewPath = true;
             }
        }

        if (needsNewPath) {
             chaserPath = findPath(tempChaserPos, tempTargetPos);
             currentPathIndex = 0;
             if (chaserPath.length > 1 && tempChaserPos.distanceToSquared(chaserPath[0]) < (wallSize*0.2)**2 ) {
                  currentPathIndex = 1;
             }
             timeSinceLastPathRecalc = 0;
             lastPathPlayerGrid = worldToGrid(tempTargetPos);
         }
    }

    chaserMoveDir.set(0,0,0);
    if (useDirectChase) {
        chaserMoveDir.copy(tempPlayerPos).sub(tempChaserPos);
        chaserMoveDir.y = 0;
    } else {
         if (chaserPath.length > 0 && currentPathIndex < chaserPath.length) {
             chaserTargetPoint.copy(chaserPath[currentPathIndex]);
             chaserTargetPoint.y = chaserRadius;
             chaserDirectionTarget.copy(chaserTargetPoint);
             chaserMoveDir.copy(chaserDirectionTarget).sub(tempChaserPos);
             chaserMoveDir.y = 0;

             tempChaserPos.y = chaserRadius;
             const distToArrivalNodeSq = tempChaserPos.distanceToSquared(chaserTargetPoint);
             if (distToArrivalNodeSq < targetReachedThresholdSq) {
                 currentPathIndex++;
                 if (currentPathIndex >= chaserPath.length) {
                     chaserPath = [];
                     lastPathPlayerGrid = null;
                 }
             }
         }
    }

    if(chaserMoveDir.lengthSq() > 0.0001) {
        chaserMoveDir.normalize();
        const chaserFrameSpeed = chaserSpeed * clampedDelta;
        const moveAmount = chaserMoveDir.clone().multiplyScalar(chaserFrameSpeed);
        let moved = false;
        const currentPos = chaserMesh.position.clone();

        let directCollision = checkChaserWallCollisionWithMove(currentPos, moveAmount);

        if (!directCollision) {
            chaserMesh.position.add(moveAmount);
            moved = true;
        } else {
             const moveX = new THREE.Vector3(moveAmount.x, 0, 0);
             const moveZ = new THREE.Vector3(0, 0, moveAmount.z);

             if (Math.abs(moveAmount.x) > 0.001) {
                let xCollision = checkChaserWallCollisionWithMove(currentPos, moveX);
                if (!xCollision) {
                     chaserMesh.position.add(moveX);
                     moved = true;
                 }
             }
             if (!moved && Math.abs(moveAmount.z) > 0.001) {
                 let zCollision = checkChaserWallCollisionWithMove(currentPos, moveZ);
                 if (!zCollision) {
                     chaserMesh.position.add(moveZ);
                     moved = true;
                 }
             }
        }

        if (moved) {
             chaserCollider.center.copy(chaserMesh.position);
        }
    }
    chaserCollider.center.copy(chaserMesh.position);


    const playerChaserDistSqXY = new THREE.Vector2(camera.position.x, camera.position.z)
                                    .distanceToSquared(new THREE.Vector2(chaserMesh.position.x, chaserMesh.position.z));
    const collisionThresholdXY = playerRadius + chaserRadius * 0.8;
    const collisionThresholdSqXY = collisionThresholdXY * collisionThresholdXY;

    if (playerChaserDistSqXY < collisionThresholdSqXY) {
        const playerBottom = camera.position.y - playerHeight;
        const playerTop = camera.position.y;
        const chaserBottom = chaserMesh.position.y - chaserRadius;
        const chaserTop = chaserMesh.position.y + chaserRadius;
        const verticalOverlap = (playerBottom < chaserTop) && (playerTop > chaserBottom);

        if (verticalOverlap) {
            triggerGameOver();
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (hintCamera) {
        hintCamera.aspect = window.innerWidth / window.innerHeight;
        hintCamera.updateProjectionMatrix();
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(animate);