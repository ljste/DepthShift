import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.139.2/three.module.js';

let gameStarted = false;
let gameOver = false;
let isPaused = false;
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const restartButton = document.getElementById('restartButton');
const instructionsDiv = document.getElementById('instructions');
let isPointerLocked = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xadd8e6);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x606060);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 15, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);
renderer.shadowMap.enabled = true;

const mazeLayout = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 1, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];
const wallSize = 5;
const wallHeight = 3;
const mazeRows = mazeLayout.length;
const mazeCols = mazeLayout[0].length;
const walls = [];
const wallBoxes = [];
const wallMeshes = [];
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide });

for (let row = 0; row < mazeRows; row++) {
    for (let col = 0; col < mazeCols; col++) {
        if (mazeLayout[row][col] === 1) {
            const wallGeometry = new THREE.BoxGeometry(wallSize, wallHeight, wallSize);
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            const worldPos = gridToWorld(row, col);
            wallMesh.position.set(worldPos.x, wallHeight / 2, worldPos.z);
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            scene.add(wallMesh);
            walls.push(wallMesh);
            wallMeshes.push(wallMesh);
            const box = new THREE.Box3().setFromObject(wallMesh);
            box.min.y -= 0.1;
            wallBoxes.push(box);
        }
    }
}

const mazeWidth = mazeCols * wallSize;
const mazeDepth = mazeRows * wallSize;
const floorGeometry = new THREE.PlaneGeometry(mazeWidth, mazeDepth);
const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.y = 0;
floorMesh.position.x = (mazeCols / 2) * wallSize - wallSize / 2;
floorMesh.position.z = (mazeRows / 2) * wallSize - wallSize / 2;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

const playerHeight = wallHeight * 0.6;
const playerRadius = 0.4;
const moveSpeed = 5.0;
const mouseSensitivity = 0.002;
const gravity = 20.0;
const jumpStrength = 5.0;
let playerVelocityY = 0;
let onGround = true;

let startPosWorld = gridToWorld(1, 1);
findStartPosition:
for (let r = 1; r < mazeRows - 1; r++) {
    for (let c = 1; c < mazeCols - 1; c++) {
        if (mazeLayout[r][c] === 0) {
            startPosWorld = gridToWorld(r, c);
            break findStartPosition;
        }
    }
}
camera.position.set(startPosWorld.x, playerHeight, startPosWorld.z);
camera.rotation.order = 'YXZ';
camera.rotation.y = 0; camera.rotation.x = 0;

const chaserRadius = 0.8;
const chaserSpeed = 3.5;
const chaserGeometry = new THREE.SphereGeometry(chaserRadius, 16, 16);
const chaserMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const chaserMesh = new THREE.Mesh(chaserGeometry, chaserMaterial);
chaserMesh.castShadow = true;
const chaserCollider = new THREE.Sphere(undefined, chaserRadius);

let chaserStartPosWorld = gridToWorld(mazeRows - 2, mazeCols - 2);
if (mazeLayout[mazeRows - 2][mazeCols - 2 ] !== 0) {
    findChaserStart:
    for (let r = mazeRows - 2; r > 0; r--) {
        for (let c = mazeCols - 2; c > 0; c--) {
            if (mazeLayout[r][c] === 0) {
                const currentStartPosGrid = worldToGrid(startPosWorld);
                const distSq = (c - currentStartPosGrid.col)**2 + (r - currentStartPosGrid.row)**2;
                if (distSq > 4**2) {
                    chaserStartPosWorld = gridToWorld(r, c);
                    break findChaserStart;
                }
            }
        }
    }
}
chaserMesh.position.set(chaserStartPosWorld.x, chaserRadius, chaserStartPosWorld.z);
chaserCollider.center.copy(chaserMesh.position);
scene.add(chaserMesh);

let chaserPath = [];
let currentPathIndex = 0;
let timeSinceLastPathRecalc = 0;
const pathRecalcInterval = 0.3;
const directChaseDistanceThresholdSq = (wallSize * 1.75) * (wallSize * 1.75);
const raycaster = new THREE.Raycaster();
const chaserRayOrigin = new THREE.Vector3();
const chaserRayDirection = new THREE.Vector3();

const keyState = {};
window.addEventListener('keydown', (event) => {
    keyState[event.code] = true;
     if (event.code === 'Space' && onGround && !gameOver && gameStarted && !isPaused) {
        playerVelocityY = jumpStrength;
        onGround = false;
    }
     if (event.code === 'Escape' && isPointerLocked && gameStarted && !gameOver) {
         document.exitPointerLock();
     }
});
window.addEventListener('keyup', (event) => { keyState[event.code] = false; });

startButton.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    setTimeout(() => { startScreen.style.display = 'none'; }, 500);
    gameStarted = true;
    isPaused = false;
    gameOver = false;
    pauseScreen.classList.remove('visible');
    pauseScreen.classList.add('hidden');
    clock.start();
    clock.getDelta();
    if (!isPointerLocked) {
        renderer.domElement.requestPointerLock();
    }
});

renderer.domElement.addEventListener('click', () => {
    if (!isPointerLocked && gameStarted && !gameOver && !isPaused) {
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
        } else if (gameStarted && !gameOver) {
             instructionsDiv.style.display = 'none';
             pauseScreen.classList.remove('visible');
             pauseScreen.classList.add('hidden');
        }
    } else {
        document.removeEventListener('mousemove', onMouseMove, false);
        if (gameStarted && !gameOver) {
            pauseGame();
        }
    }
}, false);

document.addEventListener('pointerlockerror', (e) => {
    console.error('Pointer Lock Error', e);
    isPointerLocked = false;
    document.removeEventListener('mousemove', onMouseMove, false);
    if (gameStarted && !gameOver && !isPaused) {
         pauseGame();
    }
}, false);

function pauseGame() {
    if (!gameStarted || gameOver || isPaused) return;
    isPaused = true;
    pauseScreen.classList.remove('hidden');
    pauseScreen.classList.add('visible');
    instructionsDiv.style.display = 'none';
    clock.stop();
}

function resumeGame() {
     if (!isPaused) return;
     isPaused = false;
     pauseScreen.classList.remove('visible');
     pauseScreen.classList.add('hidden');
     instructionsDiv.style.display = 'none';
     clock.start();
     clock.getDelta();
}


function onMouseMove(event) {
    if (!isPointerLocked || gameOver || !gameStarted || isPaused) return;
    const movementX = event.movementX || 0; const movementY = event.movementY || 0;
    camera.rotation.y -= movementX * mouseSensitivity;
    camera.rotation.x -= movementY * mouseSensitivity;
    camera.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camera.rotation.x));
}

const playerCollider = new THREE.Box3();
const playerWidth = playerRadius * 2;
const playerVisualHeight = 1.7;
const playerSizeVec = new THREE.Vector3(playerWidth, playerVisualHeight, playerWidth);

function checkPlayerWallCollision(moveDirection) {
    const checkPosition = camera.position.clone().add(moveDirection.clone().multiplyScalar(1.1));
    checkPosition.y -= playerHeight - (playerVisualHeight / 2) ;
    playerCollider.setFromCenterAndSize(checkPosition, playerSizeVec);

    for (const wallBox of wallBoxes) {
        if (playerCollider.intersectsBox(wallBox)) return true;
    }
    return false;
}

function checkChaserWallCollisionWithMove(currentPos, moveVec) {
    const nextPos = currentPos.clone().add(moveVec);
    chaserCollider.center.copy(nextPos);
    chaserCollider.center.y = chaserRadius;
    for (const wallBox of wallBoxes) {
        if (chaserCollider.intersectsBox(wallBox)) return true;
    }
    return false;
}

function gridToWorld(row, col) {
    return new THREE.Vector3(col * wallSize, 0, row * wallSize);
}
function worldToGrid(worldPos) {
    return { row: Math.round(worldPos.z / wallSize), col: Math.round(worldPos.x / wallSize) };
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
    const startGrid = worldToGrid(startWorldPos);
    const endGrid = worldToGrid(endWorldPos);
    if (startGrid.row === endGrid.row && startGrid.col === endGrid.col) return [];
    const startRowValid = startGrid.row >= 0 && startGrid.row < mazeRows;
    const startColValid = startGrid.col >= 0 && startGrid.col < mazeCols;
    const endRowValid = endGrid.row >= 0 && endGrid.row < mazeRows;
    const endColValid = endGrid.col >= 0 && endGrid.col < mazeCols;
    if (!startRowValid || !startColValid || mazeLayout[startGrid.row][startGrid.col] === 1 ||
        !endRowValid   || !endColValid   || mazeLayout[endGrid.row][endGrid.col] === 1) return [];

    const openSet = new Map(); const closedSet = new Set();
    const startNode = new PathNode(startGrid.row, startGrid.col, 0);
    startNode.h = heuristic(startNode, endGrid); startNode.f = startNode.g + startNode.h;
    const startKey = `${startGrid.row},${startGrid.col}`; openSet.set(startKey, startNode);

    while (openSet.size > 0) {
        let lowestF = Infinity; let currentKey = null; let currentNode = null;
        for (const [key, node] of openSet) { if (node.f < lowestF) { lowestF = node.f; currentKey = key; currentNode = node; } }
        if (currentNode.row === endGrid.row && currentNode.col === endGrid.col) {
            const path = []; let temp = currentNode;
            while (temp) { path.push(gridToWorld(temp.row, temp.col)); temp = temp.parent; } return path.reverse();
        }
        openSet.delete(currentKey); closedSet.add(currentKey);
        const neighbors = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 } ];
        for (const move of neighbors) {
            const nRow = currentNode.row + move.dr; const nCol = currentNode.col + move.dc;
            const nKey = `${nRow},${nCol}`;
            if (nRow < 0 || nRow >= mazeRows || nCol < 0 || nCol >= mazeCols) continue;
            if (mazeLayout[nRow][nCol] === 1) continue; if (closedSet.has(nKey)) continue;
            const tentativeG = currentNode.g + 1; let nNode = openSet.get(nKey);
            if (!nNode || tentativeG < nNode.g) {
                if (!nNode) nNode = new PathNode(nRow, nCol);
                nNode.parent = currentNode; nNode.g = tentativeG; nNode.h = heuristic(nNode, endGrid);
                nNode.f = nNode.g + nNode.h; if (!openSet.has(nKey)) openSet.set(nKey, nNode);
            }
        }
    } return [];
}

function hasLineOfSight(startPos, endPos) {
    chaserRayOrigin.copy(startPos); chaserRayOrigin.y = chaserRadius;
    chaserRayDirection.copy(endPos).sub(startPos);
    const distance = chaserRayDirection.length(); chaserRayDirection.normalize();
    raycaster.set(chaserRayOrigin, chaserRayDirection); raycaster.far = distance;
    const intersects = raycaster.intersectObjects(wallMeshes); return intersects.length === 0;
}

function triggerGameOver() {
    if (gameOver) return;
    gameOver = true;
    gameStarted = false;
    isPaused = false;
    clock.stop();
    gameOverScreen.style.display = 'flex';
    instructionsDiv.style.display = 'none';
    pauseScreen.classList.remove('visible');
    pauseScreen.classList.add('hidden');
    if (isPointerLocked) document.exitPointerLock();
}
restartButton.addEventListener('click', () => window.location.reload());

const clock = new THREE.Clock(false);
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const playerMoveDirection = new THREE.Vector3();
const chaserTargetPoint = new THREE.Vector3();
const chaserDirectionTarget = new THREE.Vector3();
const chaserMoveDir = new THREE.Vector3();
const targetReachedThresholdSq = 0.6 * 0.6;
const tempChaserPos = new THREE.Vector3();
const tempPlayerPos = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);

    if (!gameStarted || gameOver || isPaused || !clock.running) {
        renderer.render(scene, camera);
        return;
    }

    const delta = clock.getDelta();
    timeSinceLastPathRecalc += delta;

    playerMoveDirection.set(0, 0, 0);
    const moveDistance = moveSpeed * delta;
    camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
    right.crossVectors(forward, camera.up);
    if (keyState['KeyW']) playerMoveDirection.add(forward.clone().multiplyScalar(moveDistance));
    if (keyState['KeyS']) playerMoveDirection.add(forward.clone().multiplyScalar(-moveDistance));
    if (keyState['KeyA']) playerMoveDirection.add(right.clone().multiplyScalar(-moveDistance));
    if (keyState['KeyD']) playerMoveDirection.add(right.clone().multiplyScalar(moveDistance));

    const combinedMove = playerMoveDirection.clone();
    if (combinedMove.lengthSq() > 0) {
        if (!checkPlayerWallCollision(combinedMove)) {
            camera.position.add(combinedMove);
        } else {
            const moveX = new THREE.Vector3(combinedMove.x, 0, 0);
            const moveZ = new THREE.Vector3(0, 0, combinedMove.z);
            if (moveX.lengthSq() > 0 && !checkPlayerWallCollision(moveX)) camera.position.add(moveX);
            if (moveZ.lengthSq() > 0 && !checkPlayerWallCollision(moveZ)) camera.position.add(moveZ);
        }
    }

    playerVelocityY -= gravity * delta;
    camera.position.y += playerVelocityY * delta;

    if (camera.position.y <= playerHeight) {
        camera.position.y = playerHeight;
        playerVelocityY = 0;
        onGround = true;
    } else {
        onGround = false;
    }


    tempChaserPos.copy(chaserMesh.position);
    tempPlayerPos.copy(camera.position);
    const distanceToPlayerSq = tempChaserPos.distanceToSquared(tempPlayerPos);
    let useDirectChase = false; let forcePathRecalc = false;

    if (distanceToPlayerSq < directChaseDistanceThresholdSq) {
        if (hasLineOfSight(tempChaserPos, tempPlayerPos)) {
            useDirectChase = true; if (chaserPath.length > 0) { chaserPath = []; currentPathIndex = 0; }
        } else { if(timeSinceLastPathRecalc > pathRecalcInterval * 0.5) { forcePathRecalc = true; } }
    }

    chaserMoveDir.set(0,0,0);
    if (useDirectChase) {
        chaserMoveDir.copy(tempPlayerPos).sub(tempChaserPos); chaserMoveDir.y = 0;
    } else {
         if (forcePathRecalc || timeSinceLastPathRecalc > pathRecalcInterval || chaserPath.length === 0 && distanceToPlayerSq > targetReachedThresholdSq) {
             chaserPath = findPath(tempChaserPos, tempPlayerPos); currentPathIndex = 0;
             if (chaserPath.length > 1) { const dSq = tempChaserPos.distanceToSquared(chaserPath[0]);
                 if (dSq < (wallSize*0.4)**2 ) { currentPathIndex = 1; }
             } timeSinceLastPathRecalc = 0;
         }
         if (chaserPath.length > 0 && currentPathIndex < chaserPath.length) {
             chaserTargetPoint.copy(chaserPath[currentPathIndex]); chaserTargetPoint.y = chaserRadius;
             const lookaheadIndex = Math.min(currentPathIndex + 1, chaserPath.length - 1);
             chaserDirectionTarget.copy(chaserPath[lookaheadIndex]); chaserDirectionTarget.y = chaserRadius;
             chaserMoveDir.copy(chaserDirectionTarget).sub(tempChaserPos); chaserMoveDir.y = 0;
             tempChaserPos.y = chaserRadius;
             const distToArrivalNodeSq = tempChaserPos.distanceToSquared(chaserTargetPoint);
             if (distToArrivalNodeSq < targetReachedThresholdSq) {
                 currentPathIndex++; if (currentPathIndex >= chaserPath.length) { chaserPath = []; chaserMoveDir.set(0,0,0);}
             }
         }
    }

    if(chaserMoveDir.lengthSq() > 0.0001) { chaserMoveDir.normalize(); }

    if(chaserMoveDir.lengthSq() > 0.0001) {
        const chaserFrameSpeed = chaserSpeed * delta;
        const moveAmount = chaserMoveDir.clone().multiplyScalar(chaserFrameSpeed);
        if (!checkChaserWallCollisionWithMove(chaserMesh.position, moveAmount)) {
            chaserMesh.position.add(moveAmount);
        } else {
             const moveX = new THREE.Vector3(moveAmount.x, 0, 0); const moveZ = new THREE.Vector3(0, 0, moveAmount.z);
             tempChaserPos.copy(chaserMesh.position);
             if (moveX.lengthSq() > 0 && !checkChaserWallCollisionWithMove(tempChaserPos, moveX)) { chaserMesh.position.add(moveX); tempChaserPos.add(moveX); }
             if (moveZ.lengthSq() > 0 && !checkChaserWallCollisionWithMove(tempChaserPos, moveZ)) { chaserMesh.position.add(moveZ); }
        }
         chaserCollider.center.copy(chaserMesh.position);
    } else { chaserCollider.center.copy(chaserMesh.position); }


    const playerChaserDistSq = camera.position.distanceToSquared(chaserMesh.position);
    const collisionThreshold = playerRadius + chaserRadius;
    const collisionThresholdSq = collisionThreshold * collisionThreshold;
    if (playerChaserDistSq < collisionThresholdSq) { triggerGameOver(); }


    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
