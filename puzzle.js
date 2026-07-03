// Image loading
const imageUrl = 'https://raw.githubusercontent.com/nishi-0212/puzzle-love/main/photo.jpg';
const GRID_SIZE = 4;
const PIECE_SIZE = 200;
const GRID_COLS = 4;
const GRID_ROWS = 4;
const SNAP_DISTANCE = 30;

let canvas, ctx;
let image = new Image();
let pieces = [];
let draggedPiece = null;
let offsetX = 0;
let offsetY = 0;
let completedPieces = new Set();

class Piece {
    constructor(col, row, imageData) {
        this.col = col;
        this.row = row;
        this.correctX = col * PIECE_SIZE;
        this.correctY = row * PIECE_SIZE;
        this.x = Math.random() * (canvas.width - PIECE_SIZE);
        this.y = Math.random() * (canvas.height - PIECE_SIZE);
        this.imageData = imageData;
        this.isPlaced = false;
        this.id = col + row * GRID_COLS;
    }

    draw(ctx) {
        if (!this.isPlaced) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        } else {
            ctx.shadowColor = 'transparent';
        }

        ctx.putImageData(this.imageData, this.x, this.y);
        ctx.strokeStyle = this.isPlaced ? 'rgba(102, 126, 234, 0.3)' : 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, PIECE_SIZE, PIECE_SIZE);
        ctx.shadowColor = 'transparent';
    }

    contains(x, y) {
        return x >= this.x && x < this.x + PIECE_SIZE &&
               y >= this.y && y < this.y + PIECE_SIZE;
    }

    snapToPosition() {
        const distance = Math.hypot(
            this.x - this.correctX,
            this.y - this.correctY
        );

        if (distance < SNAP_DISTANCE) {
            this.x = this.correctX;
            this.y = this.correctY;
            this.isPlaced = true;
            return true;
        }
        return false;
    }
}

function init() {
    canvas = document.getElementById('puzzleCanvas');
    ctx = canvas.getContext('2d');

    if (window.innerWidth <= 768) {
        canvas.width = 400;
        canvas.height = 400;
    }

    image.onload = () => {
        createPieces();
        draw();
    };

    image.onerror = () => {
        ctx.fillStyle = '#ddd';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading image...', canvas.width / 2, canvas.height / 2);
    };

    image.src = imageUrl;

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart);
    canvas.addEventListener('touchmove', onTouchMove);
    canvas.addEventListener('touchend', onTouchEnd);
}

function createPieces() {
    pieces = [];
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = PIECE_SIZE;
    tempCanvas.height = PIECE_SIZE;
    const tempCtx = tempCanvas.getContext('2d');

    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            tempCtx.clearRect(0, 0, PIECE_SIZE, PIECE_SIZE);
            tempCtx.drawImage(
                image,
                col * PIECE_SIZE, row * PIECE_SIZE, PIECE_SIZE, PIECE_SIZE,
                0, 0, PIECE_SIZE, PIECE_SIZE
            );

            const imageData = tempCtx.getImageData(0, 0, PIECE_SIZE, PIECE_SIZE);
            pieces.push(new Piece(col, row, imageData));
        }
    }

    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
}

function draw() {
    ctx.fillStyle = 'rgba(245, 247, 250, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * PIECE_SIZE, 0);
        ctx.lineTo(i * PIECE_SIZE, PIECE_SIZE * GRID_ROWS);
        ctx.stroke();
    }
    for (let i = 0; i <= GRID_ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * PIECE_SIZE);
        ctx.lineTo(PIECE_SIZE * GRID_COLS, i * PIECE_SIZE);
        ctx.stroke();
    }

    for (let piece of pieces) {
        piece.draw(ctx);
    }

    updateProgress();
}

function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = pieces.length - 1; i >= 0; i--) {
        if (pieces[i].contains(x, y)) {
            draggedPiece = pieces[i];
            offsetX = x - draggedPiece.x;
            offsetY = y - draggedPiece.y;
            pieces.splice(i, 1);
            pieces.push(draggedPiece);
            break;
        }
    }
}

function onMouseMove(e) {
    if (draggedPiece && !draggedPiece.isPlaced) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        draggedPiece.x = x - offsetX;
        draggedPiece.y = y - offsetY;

        draggedPiece.x = Math.max(0, Math.min(draggedPiece.x, canvas.width - PIECE_SIZE));
        draggedPiece.y = Math.max(0, Math.min(draggedPiece.y, canvas.height - PIECE_SIZE));

        draw();
    }
}

function onMouseUp() {
    if (draggedPiece) {
        if (draggedPiece.snapToPosition()) {
            completedPieces.add(draggedPiece.id);
            playSound('snap');
        }
        draggedPiece = null;
        draw();
        checkCompletion();
    }
}

function onTouchStart(e) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    for (let i = pieces.length - 1; i >= 0; i--) {
        if (pieces[i].contains(x, y)) {
            draggedPiece = pieces[i];
            offsetX = x - draggedPiece.x;
            offsetY = y - draggedPiece.y;
            pieces.splice(i, 1);
            pieces.push(draggedPiece);
            break;
        }
    }
}

function onTouchMove(e) {
    if (draggedPiece && !draggedPiece.isPlaced) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        draggedPiece.x = x - offsetX;
        draggedPiece.y = y - offsetY;

        draggedPiece.x = Math.max(0, Math.min(draggedPiece.x, canvas.width - PIECE_SIZE));
        draggedPiece.y = Math.max(0, Math.min(draggedPiece.y, canvas.height - PIECE_SIZE));

        draw();
    }
}

function onTouchEnd() {
    if (draggedPiece) {
        if (draggedPiece.snapToPosition()) {
            completedPieces.add(draggedPiece.id);
            playSound('snap');
        }
        draggedPiece = null;
        draw();
        checkCompletion();
    }
}

function updateProgress() {
    const progress = (completedPieces.size / pieces.length) * 100;
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressFill.style.width = progress + '%';
    progressText.textContent = Math.floor(progress) + '%';
}

function checkCompletion() {
    if (completedPieces.size === pieces.length) {
        setTimeout(() => {
            showCompletion();
        }, 500);
    }
}

function showCompletion() {
    const message = document.getElementById('completionMessage');
    message.classList.add('show');
    playSound('complete');
}

function resetPuzzle() {
    completedPieces.clear();
    for (let piece of pieces) {
        piece.isPlaced = false;
        piece.x = Math.random() * (canvas.width - PIECE_SIZE);
        piece.y = Math.random() * (canvas.height - PIECE_SIZE);
    }
    const message = document.getElementById('completionMessage');
    message.classList.remove('show');
    draw();
}

function playSound(type) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (type === 'snap') {
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } else if (type === 'complete') {
            oscillator.frequency.value = 1200;
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        }
    } catch (e) {
        console.log('Audio not available');
    }
}

window.addEventListener('DOMContentLoaded', init);
