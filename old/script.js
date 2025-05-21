const paragraphs = {

    "introducao": "",

    // ********************background

    // magazine luiza
    "luizalabs1": "I’m currently a Senior Software Engineer at Luizalabs",
    "luizalabs2": "where I focus on backend solutions using Python with FastAPI, MongoDB, Kafka, and Kubernetes ArgoCD",
    "luizalabs3": "In this role, I’ve had the opportunity to create back-office applications that manage marketplace sellers and leads interested in selling on Magazine Luiza",
    "luizalabs4": "a major retail company in Brazil",
    "luizalabs5": "One of my key accomplishments there was developing an internal risk analysis system to replace an expensive external integration",
    "luizalabs6": "ultimately saving 200,000 per year",
    "luizalabs_completo": "I’m currently a Senior Software Engineer at Luizalabs, where I focus on backend solutions using Python with FastAPI, MongoDB, Kafka, and Kubernetes ArgoCD. In this role, I’ve had the opportunity to create back-office applications that manage marketplace sellers and leads interested in selling on Magazine Luiza, a major retail company in Brazil. One of my key accomplishments there was developing an internal risk analysis system to replace an expensive external integration, ultimately saving 200,000 per year",

    //tembici
    "tembici1":"Before Luizalabs, I worked as a Mid-level Software Engineer at Tembici",
    "tembici2":"contributing to the IFood Pedal project a bike rental app with over 18 thousand delivery drivers already registered",
    "tembici3":"which won the “Innovation of the Year” award at Estadão Mobilidade",
    "tembici4":"I primarily used Python with Django, Postgres, and Celery to handle robust backend processes.",
    "tembici_completo": "Before Luizalabs, I worked as a Mid-level Software Engineer at Tembici, contributing to the IFood Pedal project a bike rental app with over 18 thousand delivery drivers already registered, which won the “Innovation of the Year” award at Estadão Mobilidade. I primarily used Python/Django, Postgres, and Celery to handle robust backend processes.",

    //everis

    "everis1":"Prior to Tembici, I joined Everis as a Mid-level Software Engineer",
    "everis2":"handling backend tasks for Ambev’s B2B product catalog ",
    "everis3":"with Django, Postgres, RabbitMQ, and AWS.",
    "everis_completo": "Prior to Tembici, I joined Everis as a Mid-level Software Engineer, handling backend tasks for Ambev’s B2B product catalog with Django, Postgres, RabbitMQ, and AWS.",


    //santander

    "santander1": "Finally, I started my career at Santander Bank as an Entry-Level Software Developer,",
    "santander2": "working on both backend Python with Flask and frontend React for payment and direct debit systems.",
    "santander_completo": "Finally, I started my career at Santander Bank as an Entry-Level Software Developer, working on both backend Python with Flask and frontend React for payment and direct debit systems.",

    // ******************** sobre dificultade em um projeto (faced)

    "faced1": "One of the biggest challenges we faced was understanding the legacy system",
    "faced2": "because there was no proper documentation available. ",
    "faced3": "We had to reverse-engineer parts of it to ensure we captured all the necessary logic. ",
    "faced4": "Another issue stemmed from the fact that the new internal risk analysis API was being developed in parallel with our own project. ",
    "faced5": "To tackle this, we held daily meetings to align requirements,",
    "faced6": "discuss any updates, and address potential conflicts immediately.",
    "faced_completo": "One of the biggest challenges we faced was understanding the legacy system, because there was no proper documentation available. We had to reverse-engineer parts of it to ensure we captured all the necessary logic. Another issue stemmed from the fact that the new internal risk analysis API was being developed in parallel with our own project. To tackle this, we held daily meetings to align requirements, discuss any updates, and address potential conflicts immediately.",

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

    paragraph.style.color = '#F5F5F5'; // Muda a cor do texto

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


