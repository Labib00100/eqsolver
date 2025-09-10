let pyodideReady=false;
let pyodide;

// Initialize Pyodide once for advanced calculus
async function initPyodide() {
    pyodide = await loadPyodide();
    await pyodide.loadPackage(['sympy']);
    pyodideReady=true;
}
initPyodide();

const banglaToEnglish={'০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'};
let history=[];
let tesseractWorker=null;

// Persistent Tesseract worker
async function initWorker(){
    if(!tesseractWorker){
        const {createWorker} = Tesseract;
        tesseractWorker = createWorker({logger:m=>console.log(m)});
        await tesseractWorker.load();
        await tesseractWorker.loadLanguage('ben+eng');
        await tesseractWorker.initialize('ben+eng');
    }
}
initWorker();

function convertBanglaDigits(text){
    return text.split('').map(c=>banglaToEnglish[c]||c).join('');
}

function updateHistory(expr,answer){
    history.push({expr,answer});
    const historyDiv=document.getElementById('history');
    historyDiv.innerHTML='';
    history.slice().reverse().forEach(item=>{
        const div=document.createElement('div');
        div.className='history-item';
        div.innerHTML=`<b>Expression:</b> ${item.expr}<br><b>Answer:</b> ${item.answer}`;
        historyDiv.appendChild(div);
    });
}

function insertOp(op){
    const chatInput=document.getElementById('chatInput');
    chatInput.value+=op;
    chatInput.focus();
}

async function solveExpression(expr){
    expr = convertBanglaDigits(expr);
    try{
        let answer = math.evaluate(expr);
        updateHistory(expr,answer);
        return `Detected Expression: ${expr}\nAnswer: ${answer}`;
    }catch(e){
        if(!pyodideReady) return "Loading advanced solver...";
        const code = `
from sympy import symbols,solve,sympify,diff,integrate
x=symbols('x')
expr=sympify("""${expr}""")
try:
    sol=solve(expr,x)
except:
    try:
        sol=expr.doit()
    except:
        sol="Cannot solve"
sol
        `;
        const sol=await pyodide.runPythonAsync(code);
        updateHistory(expr,sol);
        return `Detected Expression: ${expr}\nSolution: ${sol}`;
    }
}

async function solveChat(){
    const input=document.getElementById('chatInput').value.trim();
    if(!input)return alert("Type a problem.");
    document.getElementById('result').innerHTML="Solving...";
    const output=await solveExpression(input);
    document.getElementById('result').innerHTML=output;
}

async function solveImage(){
    const fileInput=document.getElementById('fileInput');
    if(fileInput.files.length===0)return alert("Upload an image!");
    const img=fileInput.files[0];
    document.getElementById('result').innerHTML="Processing image...";
    await initWorker();
    const {data:{text}}=await tesseractWorker.recognize(img,{rectangle:null});
    const output=await solveExpression(text);
    document.getElementById('result').innerHTML=highlightDetected(output,text);
}

function highlightDetected(output,detectedText=null){
    if(!detectedText)return output;
    return output.replace(detectedText,`<span class="highlight">${detectedText}</span>`);
}
