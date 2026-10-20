// AI Lab page UI (from the e=3 explorer). Uses globals from /lab/core.js.
const $=id=>document.getElementById(id),E=Math.E,fmt=x=>Math.abs(x)>=1e5||(Math.abs(x)<1e-3&&x!==0)?x.toExponential(3):x.toFixed(4);
function sm(){const z=$('lg').value.split(/[ ,]+/).filter(s=>s).map(Number).filter(x=>!isNaN(x));if(!z.length)return;const a=softmaxB(z,E),b=softmaxB(z,3);
$('sm').innerHTML=z.map((v,i)=>`<div class="note">z=${v}: <span class="e">${a[i].toFixed(4)}</span> / <span class="t">${b[i].toFixed(4)}</span></div><div class="bar" style="width:${a[i]*100}%;background:var(--e)"></div><div class="bar" style="width:${b[i]*100}%;background:var(--t)"></div>`).join('');}
$('lg').oninput=sm;sm();
function axes(c,xmin,xmax,ymin,ymax){const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);g.strokeStyle='#2a2f55';g.lineWidth=1;g.font='12px sans-serif';g.fillStyle='#9aa0c3';
const X=x=>40+(x-xmin)/(xmax-xmin)*(W-50),Y=y=>H-25-(y-ymin)/(ymax-ymin)*(H-35);for(let i=0;i<=4;i++){const y=ymin+(ymax-ymin)*i/4;g.beginPath();g.moveTo(40,Y(y));g.lineTo(W-10,Y(y));g.stroke();g.fillText(y.toFixed(2),2,Y(y)+4);}
for(let i=0;i<=4;i++){const x=xmin+(xmax-xmin)*i/4;g.fillText(x.toFixed(0),X(x)-6,H-8);}return{g,X,Y};}
function line(o,pts,col){o.g.strokeStyle=col;o.g.lineWidth=2.5;o.g.beginPath();pts.forEach(([x,y],i)=>i?o.g.lineTo(o.X(x),o.Y(y)):o.g.moveTo(o.X(x),o.Y(y)));o.g.stroke();}
(function(){const o=axes($('sg'),-6,6,0,1),a=[],b=[];for(let z=-6;z<=6.001;z+=0.05){a.push([z,sigB(z,E)]);b.push([z,sigB(z,3)]);}line(o,a,'#4fc3f7');line(o,b,'#ffb74d');})();
function gr(){const A=+$('a0').value,r=+$('rr').value,t=+$('tt').value,T=+$('tg').value;
$('gr').innerHTML=`<p><span class="e">A₀·e<sup>rt</sup> = ${fmt(growth(A,r,t,E))}</span><br><span class="t">A₀·3<sup>rt</sup> = ${fmt(growth(A,r,t,3))}</span> (ratio ${fmt(growth(A,r,t,3)/growth(A,r,t,E))})</p>`;
$('tsol').innerHTML=`<p>Time to reach ${fmt(T)}: <span class="e">base e: ${timeTo(A,r,T,E).toFixed(2)}</span> · <span class="t">base 3: ${timeTo(A,r,T,3).toFixed(2)}</span><br><span class="note">t = ln(T/A₀)/(r·ln b); base-3 is faster by exactly ln 3.</span></p>`;}
['a0','rr','tt','tg'].forEach(i=>$(i).oninput=gr);gr();
$('opt').onchange=()=>$('lr').value=$('opt').value==='adam'?0.003:0.05;
const data=moons(400,0.15,7);let run=0;
function boundary(c,t){const g=c.getContext('2d'),W=c.width,s=6,img=g.createImageData(W,W);
for(let py=0;py<W;py+=s)for(let px=0;px<W;px+=s){const x=-2+px/W*4,y=2-py/W*4,p=t.predict([x,y])[1];const r=Math.round(40+180*p),b=Math.round(40+180*(1-p));
for(let dy=0;dy<s;dy++)for(let dx=0;dx<s;dx++){const k=((py+dy)*W+px+dx)*4;img.data[k]=r;img.data[k+1]=50;img.data[k+2]=b;img.data[k+3]=255;}}g.putImageData(img,0,0);
data.X.forEach((x,i)=>{g.fillStyle=data.Y[i]?'#ffcdd2':'#bbdefb';g.beginPath();g.arc((x[0]+2)/4*W,(2-x[1])/4*W,2.2,0,7);g.fill();});}
function draw(A,B,N){const mx=Math.max(...A.hist.map(h=>h.loss),...B.hist.map(h=>h.loss),.01);let o=axes($('lc'),0,N,0,mx);o.g.fillText('training loss (nats / trits)',50,14);line(o,A.hist.map((h,i)=>[i+1,h.loss]),'#4fc3f7');line(o,B.hist.map((h,i)=>[i+1,h.loss]),'#ffb74d');
o=axes($('ac'),0,N,0.5,1);o.g.fillText('accuracy',50,14);line(o,A.hist.map((h,i)=>[i+1,h.acc]),'#4fc3f7');line(o,B.hist.map((h,i)=>[i+1,h.acc]),'#ffb74d');
const a=A.hist.at(-1),b=B.hist.at(-1);$('res').innerHTML=`<tr><th></th><th>epoch</th><th>loss</th><th>NLL (nats)</th><th>accuracy</th><th>epochs→95%</th><th>ECE</th><th>LR</th></tr>`+
[[A,a,'e','base e'],[B,b,'t','base 3']].map(([t,h,c,n])=>`<tr class="${c}"><td>${n}</td><td>${t.epoch}</td><td>${h.loss.toFixed(4)}</td><td>${h.nll.toFixed(4)}</td><td>${(h.acc*100).toFixed(1)}%</td><td>${t.hit95??'—'}</td><td>${h.ece.toFixed(4)}</td><td>${t.lr.toPrecision(4)}</td></tr>`).join('');
boundary($('dbE'),A);boundary($('db3'),B);}
function train(){const id=++run,lr=+$('lr').value,seed=+$('seed').value,opt=$('opt').value,N=+$('ep').value;
const A=Trainer({base:E,lr:$('match').checked?lr*LN3:lr,seed,data,opt}),B=Trainer({base:3,lr,seed,data,opt});
(function tick(){if(id!==run)return;for(let i=0;i<3&&A.epoch<N;i++){A.trainEpoch();B.trainEpoch();}draw(A,B,N);if(A.epoch<N)requestAnimationFrame(tick);else window.DONE=true;})();}
$('go').onclick=train;$('stop').onclick=()=>run++;$('match').onchange=train;train();

let trun=0;function ttrain(){const id=++trun,lr=+$('tlr').value,N=150,F=Trainer({base:E,lr,seed:42,data}),T=Trainer({base:E,lr,seed:42,data,ternary:true});
(function tick(){if(id!==trun)return;for(let i=0;i<3&&F.epoch<N;i++){F.trainEpoch();T.trainEpoch();}const f=F.hist.at(-1),t=T.hist.at(-1),st=ternStats(T.p),wF=st.nW*32,wT=st.nW*Math.log2(3);
$('tres').innerHTML=`<tr><th></th><th>epoch</th><th>accuracy</th><th>epochs→95%</th><th>ECE</th><th>zero weights</th><th>weight bits</th><th>total bits (incl. biases)</th></tr>
<tr class="e"><td>float32</td><td>${F.epoch}</td><td>${(f.acc*100).toFixed(1)}%</td><td>${F.hit95??'—'}</td><td>${f.ece.toFixed(4)}</td><td>—</td><td>${wF}</td><td>${st.bitsFP}</td></tr>
<tr class="t"><td>ternary</td><td>${T.epoch}</td><td>${(t.acc*100).toFixed(1)}%</td><td>${T.hit95??'—'}</td><td>${t.ece.toFixed(4)}</td><td>${(st.sparsity*100).toFixed(1)}%</td><td>${wT.toFixed(0)} (${(wF/wT).toFixed(1)}× smaller)</td><td>${st.bitsTern.toFixed(0)} (${(st.bitsFP/st.bitsTern).toFixed(1)}×)</td></tr>`;
boundary($('dbF'),F);boundary($('dbT'),T);if(F.epoch<N)requestAnimationFrame(tick);else window.TDONE=true;})();}
$('tgo').onclick=ttrain;ttrain();
