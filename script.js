const paragraphs = {

    "1": 'One project where I faced a significant challenge was building a risk analysis tools for sellers at Luizalabs. The project was challenging because the legacy system had no proper documentation, and the new risk analysis API was being developed in parallel with the frontend. I handled this by leading daily meetings to align both frontend and backend teams and ensuring new documentation was up to date',
    '2': 'At Santander, I received feedback from my tech lead that my code were too complex and hard to maintain. Instead of getting defensive, I asked for guidance and took the opportunity to refactor my code. I rewrote the code to be cleaner and easier to understand.',

};

const typingText = document.querySelector(".typing-text p");
const inpField = document.querySelector(".wrapper .input-field");
const tryAgainBtn = document.querySelector(".try-again");
const seeBtn = document.querySelector(".see");
const timeTag = document.querySelector(".time span b");
const mistakeTag = document.querySelector(".mistake span");
const wpmTag = document.querySelector(".wpm span");
const cpmTag = document.querySelector(".cpm span");
const titleTag = document.querySelector(".title span");
const wrapper = document.querySelector(".wrapper");
const content_box = document.querySelector(".content-box");
const paragraph = document.querySelector(".paragraph");

let timer;
let maxTime = 10000;
let timeLeft = maxTime;
let charIndex = mistakes = isTyping = 0;

// Função para carregar o parágrafo selecionado
function loadParagraph(paragraphTitle) {
    // Verifica se o título do parágrafo existe no objeto paragraphs
    if (paragraphs[paragraphTitle]) {
        typingText.innerHTML = "";
        titleTag.innerText = paragraphTitle;
        
        paragraphs[paragraphTitle].split("").forEach(char => {
            let span = `<span>${char}</span>`;
            typingText.innerHTML += span;
        });
        typingText.querySelectorAll("span")[0].classList.add("active");
        document.addEventListener("keydown", () => inpField.focus());
        typingText.addEventListener("click", () => inpField.focus());


    } else {
        alert("Título inválido! Por favor, insira um título válido.");
    }
}

// Função para iniciar a digitação
function initTyping() {
    let characters = typingText.querySelectorAll("span");
    let typedChar = inpField.value.split("")[charIndex];
    let expectedChar = characters[charIndex].innerText;

    // Ignora pontuação, letras maiúsculas e minúsculas
    if (typedChar && expectedChar) {
        typedChar = typedChar.toLowerCase().replace(/[^a-z0-9]/gi, '');  // Remove pontuação e converte para minúsculas
        expectedChar = expectedChar.toLowerCase().replace(/[^a-z0-9]/gi, '');  // Remove pontuação e converte para minúsculas
    }

    if (charIndex < characters.length - 1 && timeLeft > 0) {
        if (!isTyping) {
            timer = setInterval(initTimer, 1000);
            isTyping = true;
        }

        if (typedChar == null) {
            if (charIndex > 0) {
                charIndex--;
                if (characters[charIndex].classList.contains("incorrect")) {
                    mistakes--;
                }
                characters[charIndex].classList.remove("correct", "incorrect");
            }
        } else {
            if (typedChar === expectedChar) {
                characters[charIndex].classList.add("correct");
            } else {
                mistakes++;
                characters[charIndex].classList.add("incorrect");
            }
            charIndex++;
        }
        characters.forEach(span => span.classList.remove("active"));
        characters[charIndex].classList.add("active");

        let wpm = Math.round(((charIndex - mistakes) / 5) / (maxTime - timeLeft) * 60);
        wpm = wpm < 0 || !wpm || wpm === Infinity ? 0 : wpm;

        wpmTag.innerText = wpm;
        mistakeTag.innerText = mistakes;
        cpmTag.innerText = charIndex - mistakes;
    } else {
        clearInterval(timer);
        inpField.value = "";
    }
}

// Inicializa o timer
function initTimer() {
    if (timeLeft > 0) {
        timeLeft--;
        timeTag.innerText = timeLeft;
        let wpm = Math.round(((charIndex - mistakes) / 5) / (maxTime - timeLeft) * 60);
        wpmTag.innerText = wpm;
    } else {
        clearInterval(timer);
    }
}

// Função para reiniciar o jogo e escolher um novo parágrafo
function resetGame() {
    let paragraphTitle = prompt("Digite o título do Texto: ");
    loadParagraph(paragraphTitle);
    clearInterval(timer);
    timeLeft = maxTime;
    charIndex = mistakes = isTyping = 0;
    inpField.value = "";
    timeTag.innerText = timeLeft;
    wpmTag.innerText = 0;
    mistakeTag.innerText = 0;
    cpmTag.innerText = 0;
}

function seeAnswer() {
    const paragraph = document.getElementById('paragraph');

    paragraph.style.color = 'blue'; // Muda a cor do texto

}

function hidden() {
    const paragraph = document.getElementById('paragraph');

    paragraph.style.color = "#1e1e1e"; // Muda a cor do texto
}

loadParagraph("Random Thoughts"); // Carrega um parágrafo inicial
inpField.addEventListener("input", initTyping);
tryAgainBtn.addEventListener("click", resetGame);
// seeBtn.addEventListener("click", seeAnswer);

seeBtn.addEventListener('mouseover', seeAnswer);
seeBtn.addEventListener('mouseout', hidden);


