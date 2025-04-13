// --- DOM References ---
const catElement = document.getElementById('cat');
const gameArea = document.getElementById('game-area');
const scoreboardElement = document.getElementById('scoreboard');
const levelIndicatorElement = document.getElementById('level-indicator');
const winMessageElement = document.getElementById('win-message');

// --- Game Settings ---
const catSpeed = 5;
const gravity = 0.6;
const jumpStrength = 12;
const pointsPerFish = 100;
const CAT_WIDTH = 55; // Store cat dimensions for easier use
const CAT_HEIGHT = 50;

// --- Game State Variables ---
let catX = 50;
let catY = 0;
let velocityX = 0;
let velocityY = 0;
let isOnGround = true;
let isJumping = false;
let score = 0;
let currentLevelIndex = 0; // Start at level 0 (index)
let isGameOver = false; // Game state flag
let gameLoopRequestId = null; // To store the requestAnimationFrame ID

// Dynamic element references - will be updated by loadLevel
let currentPlatforms = []; // Stores { element, type, left, right, topEdge, bottomEdge, width, height, orientation? }
let currentPickups = {}; // { id: {element: ref, collected: false, x, y, width, height} }
let currentDoor = null; // { element: ref, x, y, width, height }
let currentWindow = null; // New variable for the window

// --- Input State ---
let keys = { left: false, right: false, up: false };

// --- LEVEL DATA ---
const levels = [
    // Level 0 (Displayed as Level 1)
    {
        levelNumber: 1, catStartX: 50, catStartY: 0,
        platforms: [
            { id: 'l1_p1', type: 'platform', x: 150, y: 0, width: 150, height: 30 },
            { id: 'l1_p2', type: 'platform', x: 550, y: 0, width: 100, height: 100 },
            { id: 'l1_p3', type: 'platform', x: 480, y: 180, width: 120, height: 30 },
            { id: 'l1_p4', type: 'platform', x: 400, y: 290, width: 100, height: 25 },
            { id: 'l1_p5', type: 'platform', x: 480, y: 385, width: 130, height: 30 },
            { id: 'l1_p6', type: 'platform', x: 600, y: 500, width: 150, height: 25 },
        ],
        pickups: [
            { id: 'l1_f1', type: 'fish', x: 208, y: 30, width: 35, height: 25 },
            { id: 'l1_f2', type: 'fish', x: 433, y: 315, width: 35, height: 25 },
            { id: 'l1_f3', type: 'fish', x: 658, y: 525, width: 35, height: 25 },
        ],
        door: { x: 745, y: 525, width: 45, height: 70 },
        window: null // No window in level 1
    },
    // Level 1 (Displayed as Level 2)
    {
        levelNumber: 2, catStartX: 50, catStartY: 0,
        platforms: [
            { id: 'l2_p1', type: 'platform', x: 200, y: 0, width: 160, height: 30 },
            { id: 'l2_p6', type: 'platform', x: 500, y: 100, width: 130, height: 30 },
            { id: 'l2_p2', type: 'platform', x: 450, y: 200, width: 140, height: 30 },
            { id: 'l2_p4', type: 'platform', x: 600, y: 310, width: 120, height: 30 },
            { id: 'l2_p3', type: 'platform', x: 400, y: 420, width: 150, height: 30 },
            { id: 'l2_p5', type: 'platform', x: 200, y: 530, width: 180, height: 30 },
        ],
        pickups: [
            { id: 'l2_f1', type: 'fish', x: 550, y: 130, width: 35, height: 25 },
            { id: 'l2_f2', type: 'fish', x: 458, y: 450, width: 35, height: 25 },
        ],
        door: { x: 15, y: 500, width: 45, height: 70 },
        window: null // No window in level 2
    },
    // Level 2 (Displayed as Level 3) - WITH RAMP & WINDOW
    {
        levelNumber: 3,
        catStartX: 50, catStartY: 0,
        platforms: [
            // The Ramp!
            { id: 'l3_ramp1', type: 'ramp', orientation: 'left-to-right', x: 150, y: 0, width: 200, height: 100 }, // Bottom-left at 150,0 rises to 350,100

            // Standard Platforms
            { id: 'l3_p1', type: 'platform', x: 400, y: 150, width: 250, height: 30 }, // Large platform reachable from ramp top
            { id: 'l3_p2', type: 'platform', x: 700, y: 250, width: 100, height: 25 }, // Small step up-right
            { id: 'l3_p3', type: 'platform', x: 450, y: 350, width: 180, height: 30 }, // Platform up-left
            { id: 'l3_p4', type: 'platform', x: 250, y: 450, width: 120, height: 25 }, // Platform further up-left
        ],
        pickups: [
             { id: 'l3_f1', type: 'fish', x: 500, y: 180, width: 35, height: 25 }, // On l3_p1
             { id: 'l3_f2', type: 'fish', x: 500, y: 380, width: 35, height: 25 }, // On l3_p3
        ],
        door: null, // No door in level 3
        window: { // Window is the goal
            x: 50,      // Position based on red box (left side)
            y: 500,     // Position based on red box (high up)
            width: 80,  // Match CSS (or adjust)
            height: 60  // Match CSS (or adjust)
         }
    }
];

// --- Helper Functions ---
function updateCatVisuals() {
    catElement.style.left = catX + 'px';
    catElement.style.bottom = catY + 'px';
    if (velocityX > 0.1) catElement.style.transform = 'scaleX(1)';
    else if (velocityX < -0.1) catElement.style.transform = 'scaleX(-1)';
}

function updateScoreboard() {
    scoreboardElement.textContent = 'Score: ' + score;
}

function updateLevelIndicator() {
    levelIndicatorElement.textContent = 'Level: ' + levels[currentLevelIndex].levelNumber;
}

// --- Level Loading Function (Corrected Loop Restart) ---
function loadLevel(levelIndex) {
    if (levelIndex >= levels.length || levelIndex < 0) { console.error("Invalid level index:", levelIndex); return; }

    console.log(`Attempting to load level index: ${levelIndex}`);
    isGameOver = false; // Reset game over flag
    winMessageElement.style.display = 'none'; // Hide win message
    catElement.style.display = 'block'; // Make sure cat is visible

    currentLevelIndex = levelIndex;
    const levelData = levels[currentLevelIndex];

    gameArea.querySelectorAll('.platform, .ramp, .pickup, #door, #window').forEach(el => el.remove());
    currentPlatforms = []; currentPickups = {}; currentDoor = null; currentWindow = null;

    updateLevelIndicator(); updateScoreboard();

    catX = levelData.catStartX; catY = levelData.catStartY; velocityX = 0; velocityY = 0; isOnGround = true; isJumping = false;
    updateCatVisuals();

    // Create Platforms AND Ramps
    levelData.platforms.forEach(pData => {
        const pElement = document.createElement('div');
        if (pData.type === 'ramp') {
            pElement.className = 'ramp';
            if (pData.orientation) {
                pElement.classList.add(pData.orientation);
            }
        } else {
            pElement.className = 'platform';
        }
        pElement.id = pData.id;
        pElement.style.left = pData.x + 'px';
        pElement.style.bottom = pData.y + 'px';
        pElement.style.width = pData.width + 'px';
        pElement.style.height = pData.height + 'px';
        gameArea.appendChild(pElement);

        currentPlatforms.push({
            element: pElement,
            type: pData.type || 'platform',
            orientation: pData.orientation,
            left: pData.x,
            right: pData.x + pData.width,
            topEdge: pData.y + pData.height,
            bottomEdge: pData.y,
            width: pData.width,
            height: pData.height
        });
    });

    // Create Pickups
    levelData.pickups.forEach(puData => {
        const puElement = document.createElement('div');
        puElement.className = 'pickup';
        puElement.id = puData.id;
        puElement.style.left = puData.x + 'px';
        puElement.style.bottom = puData.y + 'px';
        puElement.style.width = puData.width + 'px';
        puElement.style.height = puData.height + 'px';
        gameArea.appendChild(puElement);
        currentPickups[puData.id] = {
            element: puElement,
            collected: false,
            x: puData.x,
            y: puData.y,
            width: puData.width,
            height: puData.height
        };
    });

    // Create Door
    if (levelData.door) {
        const dData = levelData.door;
        const dElement = document.createElement('div');
        dElement.id = 'door';
        dElement.style.left = dData.x + 'px';
        dElement.style.bottom = dData.y + 'px';
        dElement.style.width = dData.width + 'px';
        dElement.style.height = dData.height + 'px';
        gameArea.appendChild(dElement);
        currentDoor = {
            element: dElement,
            x: dData.x,
            y: dData.y,
            width: dData.width,
            height: dData.height
        };
    }

    // Create Window
    if (levelData.window) {
        const wData = levelData.window;
        const wElement = document.createElement('div');
        wElement.id = 'window';
        wElement.style.left = wData.x + 'px';
        wElement.style.bottom = wData.y + 'px';
        wElement.style.width = wData.width + 'px';
        wElement.style.height = wData.height + 'px';
        gameArea.appendChild(wElement);
        currentWindow = {
            element: wElement,
            x: wData.x,
            y: wData.y,
            width: wData.width,
            height: wData.height
        };
    }

    console.log(`Successfully loaded Level ${levelData.levelNumber}`);

    // --- Restart Game Loop if it was stopped ---
    if (gameLoopRequestId === null && !isGameOver) {
        console.log("Restarting game loop after level load.");
        gameLoopRequestId = requestAnimationFrame(gameLoop); // Start the loop
    } else if (gameLoopRequestId === null && isGameOver) {
        console.log("Game is over, loop remains stopped.");
    } else {
        console.log("Game loop continues running or game is over.");
    }
}


// --- Collision Detection Function (Use the last working version) ---
function checkCollisions() {
    let grounded = false;
    let headCollision = false;
    const catWidth = CAT_WIDTH;
    const catHeight = CAT_HEIGHT;
    const catBottom = catY; // Current bottom Y
    const catTop = catY + catHeight;
    const catLeft = catX; // Current left X
    const catRight = catX + catWidth; // Current right X

    // --- 1. Horizontal Movement and Collision ---
    let proposedX = catX + velocityX; // Where the cat wants to go horizontally
    if (proposedX < 0) { proposedX = 0; velocityX = 0; }
    else if (proposedX + catWidth > gameArea.offsetWidth) { proposedX = gameArea.offsetWidth - catWidth; velocityX = 0; }

    currentPlatforms.forEach(platform => {
        const verticalOverlapAABB = catTop > platform.bottomEdge && catBottom < platform.topEdge;

        // --- Standard AABB Horizontal Collision (Platforms & Ramp Bounding Box) ---
        if (verticalOverlapAABB) {
            if (velocityX > 0 && catRight <= platform.left && (proposedX + catWidth) > platform.left) {
                proposedX = platform.left - catWidth; velocityX = 0;
            } else if (velocityX < 0 && catLeft >= platform.right && proposedX < platform.right) {
                proposedX = platform.right; velocityX = 0;
            }
        }
        // --- End Standard AABB ---

        // --- Prevent walking INTO the solid part of the ramp (Horizontal Check v5) ---
        if (platform.type === 'ramp' && platform.orientation === 'left-to-right') {
            const slope = platform.height / platform.width;
            const collisionTolerance = 1; // How deep into the ramp is allowed

            // Check only if cat is roughly vertically aligned with the ramp object itself
            if (catTop > platform.bottomEdge && catBottom < platform.topEdge) {

                // Moving Right into the ramp slope?
                if (velocityX > 0 && (proposedX + catWidth) > platform.left && catRight <= platform.right) {
                    let xRelRight = Math.max(0, Math.min(platform.width, (proposedX + catWidth - platform.left)));
                    let ySlopeAtRight = platform.bottomEdge + xRelRight * slope;
                    if (catBottom + collisionTolerance < ySlopeAtRight) {
                        proposedX = catX; velocityX = 0;
                    }
                }
                // Moving Left into the ramp slope? (From right side towards left)
                else if (velocityX < 0 && proposedX < platform.right && catLeft >= platform.left) {
                    let xRelLeft = Math.max(0, Math.min(platform.width, (proposedX - platform.left)));
                    let ySlopeAtLeft = platform.bottomEdge + xRelLeft * slope;
                    if (catBottom + collisionTolerance < ySlopeAtLeft) {
                        proposedX = catX; velocityX = 0;
                    }
                }
            }
        }
        // --- End Ramp Horizontal Check ---

    }); // End forEach platform (Horizontal Pass)

    // Apply the final resolved horizontal position for this frame
    catX = proposedX;


    // --- 2. Vertical Movement and Collision ---
    let proposedY = catY + velocityY;
    const currentXRect = { left: catX, right: catX + catWidth }; // Use final X
    const catCenterX = catX + catWidth / 2;

    grounded = false;
    let potentialGroundY = -Infinity; // Highest ground point found
    let onSlope = false; // Flag if primary ground is a slope

    // Check Floor Collision FIRST
    if (proposedY <= 0) {
        potentialGroundY = 0;
    }

    // Check Vertical Platform/Ramp Collisions
    currentPlatforms.forEach(platform => {
        const horizontalOverlap = currentXRect.right > platform.left && currentXRect.left < platform.right;

        if (horizontalOverlap) {
            let currentPlatformGroundY = -Infinity;
            let isCurrentSurfaceSlope = false;

            // --- Calculate Ground Y for this object ---
            if (platform.type === 'ramp' && platform.orientation === 'left-to-right') {
                const slope = platform.height / platform.width;
                if (catCenterX >= platform.left && catCenterX <= platform.right) {
                    currentPlatformGroundY = platform.bottomEdge + (catCenterX - platform.left) * slope;
                } else if (catCenterX > platform.right) {
                    currentPlatformGroundY = platform.topEdge;
                }
                if (currentPlatformGroundY > -Infinity) isCurrentSurfaceSlope = true;

            } else if (platform.type === 'platform') {
                 currentPlatformGroundY = platform.topEdge;
                 isCurrentSurfaceSlope = false;
            }
            // --- End Ground Y Calculation ---

            // --- Evaluate Grounding on this Surface ---
            const groundTolerance = 1.5;
            if (currentPlatformGroundY > -Infinity &&
                velocityY <= groundTolerance &&
                catBottom >= currentPlatformGroundY - groundTolerance &&
                proposedY <= currentPlatformGroundY + groundTolerance)
            {
                 if (currentPlatformGroundY >= potentialGroundY) { // Prioritize highest ground
                     potentialGroundY = currentPlatformGroundY;
                     onSlope = isCurrentSurfaceSlope;
                 }
            }
            // --- End Grounding Evaluation ---

            // --- Check Head Collision ---
            if (velocityY > 0 && catTop <= platform.bottomEdge && (proposedY + catHeight) >= platform.bottomEdge) {
                 proposedY = platform.bottomEdge - catHeight;
                 velocityY = 0;
                 headCollision = true;
                 potentialGroundY = -Infinity;
                 onSlope = false;
            }
            // --- End Head Collision ---

        } // End if horizontalOverlap
    }); // End forEach platform (Vertical Pass)

    // --- Final Grounding Decision ---
    if (potentialGroundY > -Infinity) {
        // Snap to the highest potential ground found, but only if not hitting head
        if (!headCollision) {
            proposedY = potentialGroundY;
            velocityY = 0;
            grounded = true;
        } else {
            // If head collision happened, we already snapped Y down, just ensure not grounded
            grounded = false;
        }
    } else {
        // No potential ground found
        grounded = false;
    }

    // Apply the final resolved vertical position
    catY = proposedY;

    // Safety check
    if (catY < 0) { catY = 0; grounded = true; if(velocityY < 0) velocityY = 0; }

    return grounded;
}


// --- Pickup/Door/Window Collision Functions ---
function checkPickupCollisions() {
    const catRect = { left: catX, right: catX + CAT_WIDTH, bottom: catY, top: catY + CAT_HEIGHT };
    for (const pickupId in currentPickups) {
        const pickup = currentPickups[pickupId];
        if (pickup && !pickup.collected) {
            const pickupRect = { left: pickup.x, right: pickup.x + pickup.width, bottom: pickup.y, top: pickup.y + pickup.height };
            const overlap = !(catRect.right < pickupRect.left || catRect.left > pickupRect.right || catRect.top < pickupRect.bottom || catRect.bottom > pickupRect.top);
            if (overlap) { collectPickup(pickupId); }
        }
    }
}

function collectPickup(pickupId) {
    if (currentPickups[pickupId] && !currentPickups[pickupId].collected) {
        currentPickups[pickupId].collected = true;
        score += pointsPerFish;
        updateScoreboard();
        currentPickups[pickupId].element.style.display = 'none';
        console.log(`Pickup ${pickupId} collected! Score:`, score);
    }
}

function checkDoorCollision() {
    if (!currentDoor || !currentDoor.element) { return; }
    const catRect = { left: catX, right: catX + CAT_WIDTH, bottom: catY, top: catY + CAT_HEIGHT };
    const doorRect = { left: currentDoor.x, right: currentDoor.x + currentDoor.width, bottom: currentDoor.y, top: currentDoor.y + currentDoor.height };
    const overlap = !(catRect.right < doorRect.left || catRect.left > doorRect.right || catRect.top < doorRect.bottom || catRect.bottom > doorRect.top);
    if (overlap) {
        const nextLevel = currentLevelIndex + 1;
        if (nextLevel < levels.length) {
            console.log("Door hit! Loading next level...");
            loadLevel(nextLevel); // loadLevel handles stopping/starting loop
        } else {
            console.log("Door hit! You finished all levels!");
            endGame("You Win!"); // Or trigger win differently
        }
    }
}

function checkWindowCollision() {
    if (isGameOver || !currentWindow || !currentWindow.element) { return; }
    const catRect = { left: catX, right: catX + CAT_WIDTH, bottom: catY, top: catY + CAT_HEIGHT };
    const windowRect = { left: currentWindow.x, right: currentWindow.x + currentWindow.width, bottom: currentWindow.y, top: currentWindow.y + currentWindow.height };
    const overlap = !(catRect.right < windowRect.left || catRect.left > windowRect.right || catRect.top < windowRect.bottom || catRect.bottom > windowRect.top);
    if (overlap) {
        endGame("You Win! Stella has found the birds <3"); // Trigger win sequence
    }
}

// --- End Game Function (Corrected Loop Cancellation) ---
function endGame(message) {
    if (isGameOver) return;
    isGameOver = true;
    console.log("Game Over:", message);

    // Stop the game loop
    if (gameLoopRequestId) {
        cancelAnimationFrame(gameLoopRequestId); // Cancel the NEXT frame request
        const cancelledId = gameLoopRequestId; // Store before clearing
        gameLoopRequestId = null; // Clear the ID
        console.log("Cancelled animation frame request ID:", cancelledId);
    } else {
        console.log("No active game loop request ID to cancel.");
    }

    // Clear dynamic elements
    gameArea.querySelectorAll('.platform, .ramp, .pickup, #door, #window').forEach(el => el.remove());
    // Hide the cat
    catElement.style.display = 'none';

    // Display the final message
    winMessageElement.textContent = message;
    winMessageElement.style.display = 'flex';
}


// --- Game Loop Function (Corrected Structure) ---
function gameLoop() {
    // --- Core Game Logic ---
    // 1. Handle Input
    let targetVelocityX = 0;
    if (keys.left) targetVelocityX = -catSpeed;
    if (keys.right) targetVelocityX = catSpeed;
    velocityX = targetVelocityX;

    // 2. Handle Jumping
    if (keys.up && isOnGround && !isJumping) {
        velocityY = jumpStrength; isOnGround = false; isJumping = true;
    }
    if (!keys.up) isJumping = false;

    // 3. Apply Gravity
    if (!isOnGround) velocityY -= gravity;
    else velocityY = 0; // Stop vertical movement when grounded

    // 4. Perform Movement and Platform Collision Checks
    let currentlyGrounded = checkCollisions(); // This MUTATES catX, catY, velocityX, velocityY

    // 5. Update Global Ground State
    isOnGround = currentlyGrounded;

    // 6. Check for Pickup Collisions
    checkPickupCollisions();

    // 7. Check for Door Collision (might call loadLevel)
    checkDoorCollision();

    // 8. Check for Window Collision (might call endGame)
    checkWindowCollision();

    // 9. Update Visuals
    updateCatVisuals();
    // --- End Core Game Logic ---


    // --- Request Next Frame ---
    // IMPORTANT: Only schedule the next frame if the game is NOT over
    if (!isGameOver) {
        gameLoopRequestId = requestAnimationFrame(gameLoop);
    } else {
        // If game ended during this frame's logic, ensure ID is null
        if (gameLoopRequestId) { // Check if it wasn't already nulled by endGame
             console.log("Game ended this frame, ensuring loop ID is nullified.");
             gameLoopRequestId = null;
        }
    }
}

// --- Event Listeners ---
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowLeft': case 'a': keys.left = true; break;
        case 'ArrowRight': case 'd': keys.right = true; break;
        case 'ArrowUp': case 'w': case ' ': keys.up = true; break;
    }
});
document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowLeft': case 'a': keys.left = false; break;
        case 'ArrowRight': case 'd': keys.right = false; break;
        case 'ArrowUp': case 'w': case ' ': keys.up = false; break;
    }
});

// --- Initialization (Corrected Loop Start) ---
console.log("Game initialized. Starting level loading...");
loadLevel(0); // Load the first level
// The game loop is now started within loadLevel if needed