<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Valutazione Tirocinio Infermieristica - UniSalento</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 800px; margin: auto; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        h1 { color: #004a99; text-align: center; font-size: 24px; border-bottom: 2px solid #004a99; padding-bottom: 10px; }
        .tabs { display: flex; justify-content: space-around; margin-bottom: 20px; background: #eee; border-radius: 10px; padding: 5px; }
        .tab { padding: 10px 20px; cursor: pointer; border-radius: 8px; font-weight: bold; transition: 0.3s; }
        .tab.active { background: #004a99; color: white; }
        .competenza-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
        .rating { display: flex; gap: 10px; }
        input[type="radio"] { cursor: pointer; width: 20px; height: 20px; }
        textarea { width: 100%; height: 100px; margin-top: 15px; border-radius: 8px; border: 1px solid #ccc; padding: 10px; font-family: inherit; }
        .btn { display: block; width: 100%; padding: 15px; background: #28a745; color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; margin-top: 20px; transition: 0.3s; }
        .btn:hover { background: #218838; }
        .info-student { margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        input[type="text"] { padding: 8px; border: 1px solid #ccc; border-radius: 5px; }
    </style>
</head>
<body>

<div class="container">
    <h1>Valutazione Tirocinio Clinico <br><small>UniSalento - Polo di Tricase</small></h1>
    
    <div class="info-student">
        <input type="text" id="nome" placeholder="Nome Studente">
        <input type="text" id="tutor" placeholder="Nome Tutor">
    </div>

    <div class="tabs">
        <div class="tab active" onclick="switchYear(1)">1° Anno</div>
        <div class="tab" onclick="switchYear(2)">2° Anno</div>
        <div class="tab" onclick="switchYear(3)">3° Anno</div>
    </div>

    <div id="checklist">
        </div>

    <textarea id="note" placeholder="Note del Tutor ed osservazioni cliniche..."></textarea>
    
    <button class="btn" onclick="generatePDF()">Genera Report PDF</button>
</div>

<script>
    const competenze = {
        1: ["Igiene e comfort", "Rilevazione parametri vitali", "Smaltimento rifiuti sanitari"],
        2: ["Somministrazione farmaci", "Medicazioni semplici", "Cateterismo vescicale"],
        3: ["Gestione emergenze", "Medicazioni complesse/EGA", "Pianificazione assistenziale"]
    };

    let currentYear = 1;

    function switchYear(year) {
        currentYear = year;
        document.querySelectorAll('.tab').forEach((t, i) => {
            t.classList.toggle('active', i === year - 1);
        });
        renderChecklist();
    }

    function renderChecklist() {
        const container = document.getElementById('checklist');
        container.innerHTML = competenze[currentYear].map(comp => `
            <div class="competenza-row">
                <span>${comp}</span>
                <div class="rating">
                    ${[1,2,3,4,5].map(n => `<input type="radio" name="${comp}" value="${n}"> ${n}`).join('')}
                </div>
            </div>
        `).join('');
    }

    async function generatePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text("Report Valutazione Tirocinio - UniSalento", 20, 20);
        doc.setFontSize(12);
        doc.text(`Studente: ${document.getElementById('nome').value}`, 20, 35);
        doc.text(`Tutor: ${document.getElementById('tutor').value}`, 20, 45);
        doc.text(`Anno di Corso: ${currentYear}° Anno`, 20, 55);
        
        let y = 70;
        competenze[currentYear].forEach(comp => {
            const val = document.querySelector(`input[name="${comp}"]:checked`)?.value || "N/A";
            doc.text(`${comp}: Punteggio ${val}`, 20, y);
            y += 10;
        });

        doc.text("Note del Tutor:", 20, y + 10);
        doc.text(document.getElementById('note').value, 20, y + 20);

        doc.save("Valutazione_Tirocinio.pdf");
    }

    renderChecklist();
</script>

</body>
</html>
