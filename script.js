import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.139.2/three.module.js';

// --- Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xadd8e6); // Light blue sky

const camera = new THREE.PerspectiveCamera(
    75, // Field of View
    window.innerWidth / window.innerHeight, // Aspect Ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Lighting ---
// Ambient light (provides overall illumination)
const ambientLight = new THREE.AmbientLight(0x606060); // Soft white light
scene.add(ambientLight);

// Directional light (simulates sunlight)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 15, 10); // Position the light
directionalLight.castShadow = true; // Enable shadows (more computationally expensive)
scene.add(directionalLight);

// Optional: Configure shadow properties for better quality
// directionalLight.shadow.mapSize.width = 1024;
// directionalLight.shadow.mapSize.height = 1024;
// directionalLight.shadow.camera.near = 0.5;
// directionalLight.shadow.camera.far = 50;

renderer.shadowMap.enabled = true; // Enable shadow rendering

// --- Maze Definition ---
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

const wallSize = 5; // Size of each wall block
const wallHeight = 3; // How tall the walls are
const walls = []; // Array to store wall meshes for collision detection

// Materials
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 }); // Grey walls
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide }); // Dark grey floor

// --- Maze Geometry Generation ---
for (let row = 0; row < mazeLayout.length; row++) {
    for (let col = 0; col < mazeLayout[row].length; col++) {
        if (mazeLayout[row][col] === 1) {
            const wallGeometry = new THREE.BoxGeometry(wallSize, wallHeight, wallSize);
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

            // Position calculation: Center blocks on grid points
            wallMesh.position.set(
                col * wallSize, // x
                wallHeight / 2, // y (center vertically)
                row * wallSize  // z
            );
             wallMesh.castShadow = true;
             wallMesh.receiveShadow = true;
            scene.add(wallMesh);
            walls.push(wallMesh); // Add to collision array
        }
    }
}

// --- Floor Generation ---
const mazeWidth = mazeLayout[0].length * wallSize;
const mazeDepth = mazeLayout.length * wallSize;
const floorGeometry = new THREE.PlaneGeometry(mazeWidth, mazeDepth);
const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);

floorMesh.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
floorMesh.position.y = 0; // Place floor at ground level
// Adjust position to center the floor under the grid
floorMesh.position.x = (mazeLayout[0].length / 2) * wallSize - wallSize / 2;
floorMesh.position.z = (mazeLayout.length / 2) * wallSize - wallSize / 2;
floorMesh.receiveShadow = true; // Allow floor to receive shadows
scene.add(floorMesh);


// --- Player Setup ---
const playerHeight = wallHeight * 0.6; // Eye level slightly below wall top
const playerWidth = 0.5; // Player's approximate width for collision
const moveSpeed = 5.0; // Units per second
const turnSpeed = Math.PI / 2; // Radians per second (90 degrees)

// Find starting position (first '0' after the border)
let startX = 1 * wallSize;
let startZ = 1 * wallSize;
for (let r = 1; r < mazeLayout.length - 1; r++) {
    for (let c = 1; c < mazeLayout[r].length - 1; c++) {
        if (mazeLayout[r][c] === 0) {
            startX = c * wallSize;
            startZ = r * wallSize;
            break; // Found the first open spot
        }
    }
    if (startX !== 1 * wallSize) break; // Exit outer loop too
}

camera.position.set(startX, playerHeight, startZ);
camera.rotation.order = 'YXZ'; // Set rotation order for smoother control
camera.rotation.y = 0; // Start looking forward (positive Z if maze starts at origin)

// --- Input Handling ---
const keyState = {};
window.addEventListener('keydown', (event) => {
    keyState[event.code] = true;
});
window.addEventListener('keyup', (event) => {
    keyState[event.code] = false;
});

// --- Collision Detection ---
// Create a bounding box for the player
const playerCollider = new THREE.Box3();
const playerSize = new THREE.Vector3(playerWidth, playerHeight, playerWidth);

function checkCollision(moveDirection) {
    // Update the player's collider position for the *next* frame's potential position
    const nextPosition = camera.position.clone().add(moveDirection);
    playerCollider.setFromCenterAndSize(nextPosition, playerSize);

    // Check collision with each wall
    for (const wall of walls) {
        const wallCollider = new THREE.Box3().setFromObject(wall);
        if (playerCollider.intersectsBox(wallCollider)) {
            return true; // Collision detected
        }
    }
    return false; // No collision
}

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta(); // Time since last frame

    // --- Calculate Movement ---
    const moveDirection = new THREE.Vector3(0, 0, 0);
    const moveDistance = moveSpeed * delta;
    const turnDistance = turnSpeed * delta;

    // Rotation (Turning)
    if (keyState['ArrowLeft'] || keyState['KeyA']) {
        camera.rotation.y += turnDistance;
    }
    if (keyState['ArrowRight'] || keyState['KeyD']) {
        camera.rotation.y -= turnDistance;
    }

    // Forward/Backward Movement (relative to camera direction)
    if (keyState['ArrowUp'] || keyState['KeyW']) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        moveDirection.add(forward.multiplyScalar(moveDistance));
    }
    if (keyState['ArrowDown'] || keyState['KeyS']) {
        const backward = new THREE.Vector3();
        camera.getWorldDirection(backward);
        moveDirection.add(backward.multiplyScalar(-moveDistance)); // Move opposite direction
    }

    // --- Apply Movement with Collision Check ---
    // Check X/Z movement separately to allow sliding along walls
    const moveX = new THREE.Vector3(moveDirection.x, 0, 0);
    const moveZ = new THREE.Vector3(0, 0, moveDirection.z);

    if (!checkCollision(moveX)) {
        camera.position.add(moveX);
    }
    if (!checkCollision(moveZ)) {
        camera.position.add(moveZ);
    }


    // --- Render ---
    renderer.render(scene, camera);
}

// --- Handle Window Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the animation loop
animate();
