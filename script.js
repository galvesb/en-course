const paragraphs = {
//    *********************** ENTREVISTA COMPORTAMENTAL ***********************

    // Hi Guilherme, it’s great to meet you! Can you hear and see me okay?"
    "Hi Guilherme, it’s great to meet you! Can you hear and see me okay?": "Hi! Yes, everything’s working fine. Thanks for having me today.",
    
    // Perfect. I’m really glad we could connect. Just to give you a quick idea  this will be about a 45 minute chat. I’ll ask a few background questions, then some behavioral ones, and we’ll finish with your questions. Sound good?
    "Perfect. I’m really glad we could connect. ...": "Absolutely, sounds good.",
    
    
    // Can you tell me about yourself and your professional background?
    "1 Can you tell ...": "I’m currently a Senior Software Engineer at Luizalabs, where I focus on backend solutions using Python with FastAPI, MongoDB, Kafka, and Kubernetes ArgoCD. In this role, I’ve had the opportunity to create back-office applications that manage marketplace sellers and leads interested in selling on Magazine Luiza, a major retail company in Brazil. One of my main contributions here was building a risk analysis system that replaced an external legacy system, saving R$200,000 per year.",
    "2 Can you tell ...": "Before that, I worked as a Mid-level Software Engineer at Everis, where I worked on B2B product team for ambev. There, I worked with Python using Django, Postgres for the database, RabbitMQ for messaging, and AWS for cloud services.",
    "3 Can you tell ...": "Prior to that, I worked as a Mid-level Software Engineer at Tembici, where I worked on the IFood Pedal project, a bike rental app with over 18,000 delivery drivers.,The project won the “Innovation of the Year” award. There, I worked with Python using Django, Postgres for the database, and Celery for background processing.",
    "4 Can you tell ...": "Finally, I started my career at Santander Bank as an Entry-Level Software Developer, working on both backend Python with Flask and frontend React for payment team.",
    
    // Why are you looking for new opportunities?
    "Why are you looking for new opportunities?": "I'm looking for a place where I can work in English daily and work with people from all over the world.",
    
    
    // Can you tell me about a time when you faced a significant challenge in a project, and how you handled it?
    "1 Can you tell me about ...?": "One project where I faced a significant challenge was building an internal risk analysis tools for sellers at Luizalabs.",
    "2 Can you tell me about ...?": "It replaced an expensive legacy system and saved the company R$200,000 per year.",
    "3 Can you tell me about ...?": "The project was challenging because the legacy system had no proper documentation, and the new risk analysis API was being developed in parallel with the frontend.",
    "4 Can you tell me about ...?": "I handled this by leading daily meetings to align both frontend and backend teams and ensuring we delivered a resilient solution on time",


    //  ***** [ ] colocar mais perguntas aqui seguindo obsidian


    //  Thanks again, Guilherme! You’ve shared some really strong examples we’ll be in touch soon after reviewing internally.
    "Thanks again,  ...?": "Thank you! I really appreciate your time.",


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


