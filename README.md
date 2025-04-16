# DepthShift

A simple first-person 3D maze game built with Three.js where the player must navigate a maze while being chased by a persistent red ball. If the ball catches the player, the game is over.

## Overview

The player uses standard first-person controls (WASD for movement, Mouse for looking, Space to jump) to explore a maze generated from a predefined layout. A red chaser ball uses pathfinding and line-of-sight checks to intelligently pursue the player through the maze. The objective is simply to survive by avoiding the chaser.

## Features

*   **3D Maze Environment:** Generated dynamically from a 2D array definition.
*   **First-Person Controls:**
    *   WASD for forward, backward, and strafe movement relative to camera direction.
    *   Mouse look (using Pointer Lock API) for smooth panning and looking up/down.
    *   Spacebar to jump.
*   **Physics:** Basic gravity simulation acting on the player.
*   **Intelligent Chaser AI:**
    *   Uses A\* pathfinding to navigate the maze around obstacles.
    *   Switches to direct pursuit when close to the player with clear line-of-sight.
    *   Implements path lookahead for smoother turning at intersections.
*   **Collision Detection:**
    *   Player-Wall collision prevents moving through walls, allowing sliding.
    *   Chaser-Wall collision prevents the chaser from clipping through walls.
    *   Player-Chaser collision triggers the game over state.
*   **Game Over State:** Displays a game over screen with a restart option.

## Technologies & Key Concepts Used

This project demonstrates several important concepts in game development and 3D graphics:

1.  **Three.js:** The core WebGL library used for all 3D rendering aspects, including:
    *   **Scene Setup:** Creating the scene, camera (`PerspectiveCamera`), and WebGL renderer.
    *   **Geometry & Meshes:** Using `BoxGeometry` for walls, `PlaneGeometry` for the floor, and `SphereGeometry` for the chaser. Combining geometry with materials (`MeshStandardMaterial`) to create meshes.
    *   **Lighting:** Employing `AmbientLight` for overall illumination and `DirectionalLight` to simulate sunlight and cast shadows.
    *   **Materials:** Using `MeshStandardMaterial` for physically based rendering properties (color, roughness etc.) relevant with lighting.

2.  **Maze Generation:**
    *   A simple **2D Array (`mazeLayout`)** defines the wall (1) and path (0) layout.
    *   The code iterates through this array, placing wall `Mesh` objects at corresponding world coordinates (`gridToWorld` conversion).

3.  **Player Controls & Physics:**
    *   **Keyboard Input:** Event listeners (`keydown`, `keyup`) update a `keyState` object to track pressed keys.
    *   **Mouse Look (Pointer Lock API):** The `requestPointerLock()` method hides the cursor and provides continuous mouse movement data (`event.movementX`, `event.movementY`). This data directly rotates the camera using Euler angles (`camera.rotation`), with `YXZ` order specified for intuitive FPS-style control. Pitch (up/down looking) is clamped to prevent flipping.
    *   **Vector Math:** `camera.getWorldDirection()` and `Vector3.crossVectors()` are used to calculate movement vectors relative to the camera's current orientation, allowing forward/backward and strafe movement.
    *   **Simple Gravity & Jump:** A basic physics simulation is implemented for the player's vertical movement. Velocity (`playerVelocityY`) is decreased by `gravity * deltaTime` each frame. When grounded (`onGround`), jumping applies an initial upward velocity (`jumpStrength`).

4.  **Collision Detection:**
    *   **Axis-Aligned Bounding Boxes (AABB):** `THREE.Box3` is used to represent the spatial bounds of walls and the player.
    *   **Intersection Tests:** The `.intersectsBox()` method checks if the player's bounding box overlaps with any wall bounding box.
    *   **Collision Response (Sliding):** When a collision is detected on the intended movement vector, the movement is broken down into X and Z components. Each component is checked individually, allowing the player to slide along a wall if only one axis of movement is blocked.
    *   **Chaser Collision:** Uses a `THREE.Sphere` collider for the chaser and checks for intersections with wall `Box3`s using `.intersectsBox()`. Similar sliding logic is applied if a direct move would cause a collision.

5.  **Chaser AI (Hybrid Intelligenƒce):**
    *   **A\* (A-Star) Pathfinding:**
        *   This algorithm finds the shortest path between the chaser and player on the maze grid, avoiding walls.
        *   It uses a **heuristic** (Manhattan distance) to estimate cost, maintains **open and closed sets** of grid nodes, and calculates movement costs (`g`, `h`, `f`) to determine the optimal path.
        *   Helper functions (`gridToWorld`, `worldToGrid`) convert between game world coordinates and the A\* grid representation.
    *   **Path Following & Lookahead:** To avoid jerky movement at corners, the chaser doesn't aim directly *at* the current path node (`n`), but rather steers towards the *next* node in the path (`n+1`). It still checks its distance to node `n` to know when to advance its target along the path.
    *   **Line-of-Sight (LOS) Check:** `THREE.Raycaster` is used to cast a virtual ray from the chaser towards the player. If the ray intersects any `wallMeshes` before reaching the player's distance, the LOS is considered blocked.
    *   **Hybrid Behavior:**
        *   **Long Range / Blocked LOS:** The chaser relies on the A\* algorithm to find and follow a path through the maze. The path is recalculated periodically or if conditions change significantly.
        *   **Short Range & Clear LOS:** If the player is within a certain distance (`directChaseDistanceThresholdSq`) AND the `Raycaster` confirms a clear Line-of-Sight, the chaser abandons the A\* path and moves directly towards the player's current position for smoother, more immediate pursuit.

6.  **Game Loop & State Management:**
    *   `requestAnimationFrame(animate)` creates the main game loop.
    *   `THREE.Clock` provides `deltaTime` for frame-rate independent movement and physics.
    *   A `gameOver` boolean flag controls game state, stopping player/chaser movement and displaying the appropriate UI elements.
