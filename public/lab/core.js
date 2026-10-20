const LN3=Math.log(3);
function rng(s){return function(){s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function gauss(r){let u=r()||1e-9,v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function softmaxB(z,b){const k=Math.log(b),m=Math.max(...z),e=z.map(x=>Math.exp((x-m)*k)),s=e.reduce((a,c)=>a+c,0);return e.map(x=>x/s);}
function sigB(z,b){return 1/(1+Math.pow(b,-z));}
function growth(A0,r,t,b){return A0*Math.pow(b,r*t);}
function timeTo(A0,r,T,b){return Math.log(T/A0)/(r*Math.log(b));}
function moons(n,noise,seed){const r=rng(seed),X=[],Y=[];for(let i=0;i<n;i++){const c=i%2,a=Math.PI*r();let x,y;if(c===0){x=Math.cos(a);y=Math.sin(a);}else{x=1-Math.cos(a);y=0.5-Math.sin(a);}X.push([x+noise*gauss(r)-0.5,y+noise*gauss(r)-0.25]);Y.push(c);}return{X,Y};}
function makeNet(seed,H){const r=rng(seed),he=s=>gauss(r)*s;const p={W1:[],b1:new Array(H).fill(0),W2:[],b2:[0,0]};for(let j=0;j<H;j++)p.W1.push([he(1),he(1)]);for(let k=0;k<2;k++){p.W2.push([]);for(let j=0;j<H;j++)p.W2[k].push(he(Math.sqrt(2/H)));}return p;}
function quantM(W){let a=0,n=0;W.forEach(r=>r.forEach(v=>{a+=Math.abs(v);n++;}));const g=a/n+1e-8;return{g,W:W.map(r=>r.map(v=>Math.max(-1,Math.min(1,Math.round(v/g)))*g)),T:W.map(r=>r.map(v=>Math.max(-1,Math.min(1,Math.round(v/g)))))};}
function quant(p){const a=quantM(p.W1),b=quantM(p.W2);return{W1:a.W,W2:b.W,b1:p.b1,b2:p.b2,T1:a.T,T2:b.T};}
function ternStats(p){const q=quant(p),all=[...q.T1.flat(),...q.T2.flat()],nz=all.filter(v=>v===0).length,nb=p.b1.length+p.b2.length;
 return{sparsity:nz/all.length,nW:all.length,bitsTern:all.length*Math.log2(3)+nb*32+2*32,bitsFP:(all.length+nb)*32};}
function flat(p){return [p.W1.flat(),p.b1,p.W2.flat(),p.b2].flat();}
function forward(p,x){const H=p.b1.length,h=new Array(H);for(let j=0;j<H;j++){const v=p.W1[j][0]*x[0]+p.W1[j][1]*x[1]+p.b1[j];h[j]=v>0?v:0;}const z=[0,1].map(k=>{let s=p.b2[k];for(let j=0;j<H;j++)s+=p.W2[k][j]*h[j];return s;});return{h,z};}
// Trainer: base = Math.E or 3. base-3: p=softmax(z*ln3), loss=-ln p_y / ln3
function Trainer(o){const t={base:o.base,lr:o.lr,H:o.H||50,bs:o.bs||32,opt:o.opt||'adam',data:o.data,r:rng(o.seed+999),p:makeNet(o.seed,o.H||50),step:0,epoch:0,hist:[],hit95:null};
 t.k=Math.log(t.base);t.m={};t.v={};
 t.ternary=!!o.ternary;t.P=()=>t.ternary?quant(t.p):t.p;
 t.predict=x=>softmaxB(forward(t.P(),x).z,t.base);
 t.trainEpoch=function(){const {X,Y}=t.data,n=X.length,idx=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(t.r()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
  let L=0;for(let s=0;s<n;s+=t.bs){const B=idx.slice(s,s+t.bs),H=t.H;const P=t.P();const g={W1:t.p.W1.map(()=>[0,0]),b1:new Array(H).fill(0),W2:[new Array(H).fill(0),new Array(H).fill(0)],b2:[0,0]};
   for(const i of B){const x=X[i],{h,z}=forward(P,x),q=softmaxB(z,t.base);L+=-Math.log(Math.max(q[Y[i]],1e-12))/t.k;
    // dL/dz = (1/k)*k*(q-y) = q-y
    const dz=[q[0]-(Y[i]===0),q[1]-(Y[i]===1)];for(let k=0;k<2;k++){g.b2[k]+=dz[k];for(let j=0;j<H;j++)g.W2[k][j]+=dz[k]*h[j];}
    for(let j=0;j<H;j++){if(h[j]<=0)continue;const dh=dz[0]*P.W2[0][j]+dz[1]*P.W2[1][j];g.W1[j][0]+=dh*x[0];g.W1[j][1]+=dh*x[1];g.b1[j]+=dh;}}
   t.step++;const sc=1/B.length;t.apply(g,sc);}
  t.epoch++;const ev=t.evaluate();ev.loss=L/n;t.hist.push(ev);if(t.hit95===null&&ev.acc>=0.95)t.hit95=t.epoch;return ev;};
 t.apply=function(g,sc){const b1=0.9,b2=0.999,lr=t.lr;const upd=(key,arr,grad)=>{if(Array.isArray(arr[0])){arr.forEach((row,i)=>upd(key+i,row,grad[i]));return;}
   if(!t.m[key]){t.m[key]=new Array(arr.length).fill(0);t.v[key]=new Array(arr.length).fill(0);}const m=t.m[key],v=t.v[key];
   for(let i=0;i<arr.length;i++){const gi=grad[i]*sc;if(t.opt==='sgd'){arr[i]-=lr*gi;continue;}m[i]=b1*m[i]+(1-b1)*gi;v[i]=b2*v[i]+(1-b2)*gi*gi;const mh=m[i]/(1-Math.pow(b1,t.step)),vh=v[i]/(1-Math.pow(b2,t.step));arr[i]-=lr*mh/(Math.sqrt(vh)+1e-8);}};
  upd('W1',t.p.W1,g.W1);upd('b1',t.p.b1,g.b1);upd('W2',t.p.W2,g.W2);upd('b2',t.p.b2,g.b2);};
 t.evaluate=function(){const P=t.P(),pd=x=>softmaxB(forward(P,x).z,t.base);const {X,Y}=t.data;let c=0;const bins=Array.from({length:10},()=>({n:0,conf:0,acc:0}));let ce=0;
  X.forEach((x,i)=>{const q=pd(x),pr=q[1]>q[0]?1:0,cf=Math.max(q[0],q[1]),ok=pr===Y[i];c+=ok;ce+=-Math.log(Math.max(q[Y[i]],1e-12));const b=bins[Math.min(9,Math.floor(cf*10))];b.n++;b.conf+=cf;b.acc+=ok;});
  let ece=0;bins.forEach(b=>{if(b.n)ece+=b.n/X.length*Math.abs(b.acc/b.n-b.conf/b.n);});return{acc:c/X.length,ece,nll:ce/X.length};};
 return t;}
if(typeof module!=='undefined')module.exports={LN3,rng,softmaxB,sigB,growth,timeTo,moons,Trainer,ternStats};
