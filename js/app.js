
/* ========================================
   MINI PAINT PRO
   Drawing Engine
======================================== */

// ========================================
// ELEMENTOS
// ========================================

const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: false });

const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");

const brushBtn = document.getElementById("brushBtn");
const eraserBtn = document.getElementById("eraserBtn");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");

const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");

const colorValue = document.getElementById("colorValue");
const brushSizeValue = document.getElementById("brushSizeValue");

// ========================================
// CONFIGURAÇÕES
// ========================================

const STORAGE_KEY = "savedDrawing";
const MAX_HISTORY = 30;

let drawing = false;
let erasing = false;

let currentColor = colorPicker.value;
let size = Number(brushSize.value);

let lastX = 0;
let lastY = 0;

let history = [];
let historyIndex = -1;

// ========================================
// INICIALIZAÇÃO
// ========================================

ctx.lineCap = "round";
ctx.lineJoin = "round";

initialize();

// ========================================
// INICIALIZAÇÃO GERAL
// ========================================

async function initialize() {
    await loadCanvas();

    if (history.length === 0) {
        saveHistory();
    }

    updateInterface();
}

// ========================================
// COORDENADAS DO CANVAS
// ========================================

function getCoordinates(event) {
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
    };
}

// ========================================
// ATUALIZAÇÃO DA INTERFACE
// ========================================

function updateInterface() {
    colorValue.textContent = currentColor.toUpperCase();

    brushSizeValue.textContent = `${size} px`;

    brushBtn.classList.toggle("active", !erasing);
    eraserBtn.classList.toggle("active", erasing);

    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
}

// ========================================
// SELEÇÃO DE FERRAMENTAS
// ========================================

// Pincel

brushBtn.addEventListener("click", () => {
    erasing = false;
    updateInterface();
});

// Borracha

eraserBtn.addEventListener("click", () => {
    erasing = true;
    updateInterface();
});

// ========================================
// CONTROLE DE COR
// ========================================

colorPicker.addEventListener("input", () => {
    currentColor = colorPicker.value;
    erasing = false;

    updateInterface();
});

// ========================================
// CONTROLE DE TAMANHO
// ========================================

brushSize.addEventListener("input", () => {
    size = Number(brushSize.value);

    updateInterface();
});

// ========================================
// MOTOR DE DESENHO
// ========================================

canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", draw);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);
canvas.addEventListener("lostpointercapture", stopDrawing);

function startDrawing(event) {
    if (event.button !== 0 && event.pointerType === "mouse") return;

    event.preventDefault();

    drawing = true;

    canvas.setPointerCapture(event.pointerId);

    const position = getCoordinates(event);

    lastX = position.x;
    lastY = position.y;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);

    // Desenhar um ponto mesmo com um clique rápido

    ctx.globalCompositeOperation = erasing
        ? "destination-out"
        : "source-over";

    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
    ctx.lineWidth = size;

    ctx.beginPath();
    ctx.arc(lastX, lastY, size / 2, 0, Math.PI * 2);
    ctx.fill();
}

function draw(event) {
    if (!drawing) return;

    event.preventDefault();

    const position = getCoordinates(event);

    ctx.globalCompositeOperation = erasing
        ? "destination-out"
        : "source-over";

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(position.x, position.y);
    ctx.stroke();

    lastX = position.x;
    lastY = position.y;
}

function stopDrawing(event) {
    if (!drawing) return;

    drawing = false;

    ctx.globalCompositeOperation = "source-over";

    if (
        event &&
        canvas.hasPointerCapture(event.pointerId)
    ) {
        canvas.releasePointerCapture(event.pointerId);
    }

    saveHistory();
    saveCanvas();
    updateInterface();
}

// ========================================
// HISTÓRICO
// ========================================

function saveHistory() {
    // Remover estados posteriores ao atual

    history = history.slice(0, historyIndex + 1);

    // Salvar estado atual

    const image = canvas.toDataURL("image/png");

    history.push(image);

    // Limitar quantidade de estados

    if (history.length > MAX_HISTORY) {
        history.shift();
    }

    historyIndex = history.length - 1;

    updateInterface();
}

// Restaurar um estado

function restoreHistory(index) {
    if (index < 0 || index >= history.length) return;

    const image = new Image();

    image.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(image, 0, 0);

        historyIndex = index;

        saveCanvas();
        updateInterface();
    };

    image.src = history[index];
}

// Desfazer

undoBtn.addEventListener("click", () => {
    if (historyIndex <= 0) return;

    restoreHistory(historyIndex - 1);
});

// Refazer

redoBtn.addEventListener("click", () => {
    if (historyIndex >= history.length - 1) return;

    restoreHistory(historyIndex + 1);
});

// ========================================
// LIMPAR TELA
// ========================================

clearBtn.addEventListener("click", () => {
    const confirmed = confirm(
        "Tem certeza de que deseja limpar todo o desenho?"
    );

    if (!confirmed) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    saveHistory();
    saveCanvas();
    updateInterface();
});

// ========================================
// SALVAMENTO AUTOMÁTICO
// ========================================

function saveCanvas() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            canvas.toDataURL("image/png")
        );
    } catch (error) {
        console.warn(
            "Não foi possível salvar o desenho:",
            error
        );
    }
}

// ========================================
// CARREGAR DESENHO
// ========================================

function loadCanvas() {
    return new Promise((resolve) => {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            resolve();
            return;
        }

        const image = new Image();

        image.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0);

            history = [canvas.toDataURL("image/png")];
            historyIndex = 0;

            resolve();
        };

        image.onerror = () => {
            console.warn("Não foi possível carregar o desenho.");

            localStorage.removeItem(STORAGE_KEY);
            resolve();
        };

        image.src = saved;
    });
}

// ========================================
// EXPORTAR IMAGEM
// ========================================

downloadBtn.addEventListener("click", () => {
    const exportCanvas = document.createElement("canvas");

    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;

    const exportCtx = exportCanvas.getContext("2d");

    // Fundo branco para exportação

    exportCtx.fillStyle = "#ffffff";

    exportCtx.fillRect(
        0,
        0,
        exportCanvas.width,
        exportCanvas.height
    );

    // Copiar desenho

    exportCtx.drawImage(canvas, 0, 0);

    // Gerar arquivo

    const link = document.createElement("a");

    link.download = "mini-paint-pro.png";
    link.href = exportCanvas.toDataURL("image/png");

    link.click();
});

// ========================================
// ATALHOS DE TECLADO
// ========================================

document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (event.ctrlKey && key === "z") {
        event.preventDefault();

        if (event.shiftKey) {
            redoBtn.click();
        } else {
            undoBtn.click();
        }
    }

    if (event.ctrlKey && key === "y") {
        event.preventDefault();
        redoBtn.click();
    }
});
