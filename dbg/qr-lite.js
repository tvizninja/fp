/*
 * Minimal QR Code Model 2 encoder for Thermal Bridge WebApp.
 * Byte mode, UTF-8, error correction level L, mask pattern 0.
 * Project implementation based on ISO/IEC 18004 mechanics.
 */
(function(global){
'use strict';
const RS_L=[[1,26,19],[1,44,34],[1,70,55],[1,100,80],[1,134,108],[2,86,68],[2,98,78],[2,121,97],[2,146,116],[2,86,68,2,87,69],[4,101,81],[2,116,92,2,117,93],[4,133,107],[3,145,115,1,146,116],[5,109,87,1,110,88],[5,122,98,1,123,99],[1,135,107,5,136,108],[5,150,120,1,151,121],[3,141,113,4,142,114],[3,135,107,5,136,108],[4,144,116,4,145,117],[2,139,111,7,140,112],[4,151,121,5,152,122],[6,147,117,4,148,118],[8,132,106,4,133,107],[10,142,114,2,143,115],[8,152,122,4,153,123],[3,147,117,10,148,118],[7,146,116,7,147,117],[5,145,115,10,146,116],[13,145,115,3,146,116],[17,145,115],[17,145,115,1,146,116],[13,145,115,6,146,116],[12,151,121,7,152,122],[6,151,121,14,152,122],[17,152,122,4,153,123],[4,152,122,18,153,123],[20,147,117,4,148,118],[19,148,118,6,149,119]];
const PATTERN=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]];
const EXP=new Uint8Array(512),LOG=new Uint8Array(256);for(let i=0;i<8;i++)EXP[i]=1<<i;for(let i=8;i<256;i++)EXP[i]=EXP[i-4]^EXP[i-5]^EXP[i-6]^EXP[i-8];for(let i=0;i<255;i++)LOG[EXP[i]]=i;for(let i=255;i<512;i++)EXP[i]=EXP[i-255];
const G15=(1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|1,G18=(1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|1,G15MASK=(1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1);
function blocks(v){const a=RS_L[v-1],out=[];for(let i=0;i<a.length;i+=3)for(let j=0;j<a[i];j++)out.push({total:a[i+1],data:a[i+2]});return out}
function gfMul(a,b){return(!a||!b)?0:EXP[LOG[a]+LOG[b]]}
function generator(n){let g=[1];for(let i=0;i<n;i++){const next=new Array(g.length+1).fill(0),e=EXP[i];for(let j=0;j<g.length;j++){next[j]^=g[j];next[j+1]^=gfMul(g[j],e)}g=next}return g}
function ecc(data,n){const gen=generator(n),res=new Array(n).fill(0);for(const b of data){const factor=b^res[0];res.shift();res.push(0);if(factor)for(let i=0;i<n;i++)res[i]^=gfMul(gen[i+1],factor)}return res}
class Bits{constructor(){this.a=[];this.length=0}put(n,len){for(let i=len-1;i>=0;i--)this.bit(((n>>>i)&1)!==0)}bit(v){const bi=this.length>>3;if(this.a.length<=bi)this.a.push(0);if(v)this.a[bi]|=0x80>>(this.length&7);this.length++}}
function dataBytes(v,input){const bs=blocks(v),limit=bs.reduce((s,b)=>s+b.data,0)*8,b=new Bits(),lenBits=v<10?8:16;b.put(4,4);b.put(input.length,lenBits);for(const x of input)b.put(x,8);if(b.length>limit)throw new Error('QR data overflow');for(let i=0;i<Math.min(4,limit-b.length);i++)b.bit(false);while(b.length&7)b.bit(false);let pad=0;while(b.length<limit){b.put(pad++&1?0x11:0xEC,8)}let off=0,maxD=0,maxE=0;const ds=[],es=[];for(const blk of bs){const d=b.a.slice(off,off+blk.data);off+=blk.data;const e=ecc(d,blk.total-blk.data);ds.push(d);es.push(e);maxD=Math.max(maxD,d.length);maxE=Math.max(maxE,e.length)}const out=[];for(let i=0;i<maxD;i++)for(const d of ds)if(i<d.length)out.push(d[i]);for(let i=0;i<maxE;i++)for(const e of es)if(i<e.length)out.push(e[i]);return out}
function digit(x){let n=0;while(x){n++;x>>>=1}return n}
function bchTypeInfo(data){let d=data<<10;while(digit(d)-digit(G15)>=0)d^=G15<<(digit(d)-digit(G15));return((data<<10)|d)^G15MASK}
function bchTypeNumber(data){let d=data<<12;while(digit(d)-digit(G18)>=0)d^=G18<<(digit(d)-digit(G18));return(data<<12)|d}
function fit(input){for(let v=1;v<=40;v++){const cap=blocks(v).reduce((s,b)=>s+b.data,0)*8,need=4+(v<10?8:16)+input.length*8;if(need<=cap)return v}throw new Error('QR data too large')}
function makeMatrix(v,bytes){const n=v*4+17,m=Array.from({length:n},()=>Array(n).fill(null));
  function probe(row,col){for(let r=-1;r<=7;r++){if(row+r<0||row+r>=n)continue;for(let c=-1;c<=7;c++){if(col+c<0||col+c>=n)continue;m[row+r][col+c]=((r>=0&&r<=6&&(c===0||c===6))||(c>=0&&c<=6&&(r===0||r===6))||(r>=2&&r<=4&&c>=2&&c<=4))}}}
  probe(0,0);probe(n-7,0);probe(0,n-7);
  for(const row of PATTERN[v-1])for(const col of PATTERN[v-1]){if(m[row][col]!==null)continue;for(let r=-2;r<=2;r++)for(let c=-2;c<=2;c++)m[row+r][col+c]=(r===-2||r===2||c===-2||c===2||(r===0&&c===0))}
  for(let r=8;r<n-8;r++)if(m[r][6]===null)m[r][6]=(r%2===0);for(let c=8;c<n-8;c++)if(m[6][c]===null)m[6][c]=(c%2===0);
  const mask=0,info=bchTypeInfo((1<<3)|mask);for(let i=0;i<15;i++){const mod=((info>>i)&1)!==0;if(i<6)m[i][8]=mod;else if(i<8)m[i+1][8]=mod;else m[n-15+i][8]=mod}for(let i=0;i<15;i++){const mod=((info>>i)&1)!==0;if(i<8)m[8][n-i-1]=mod;else if(i<9)m[8][15-i]=mod;else m[8][14-i]=mod}m[n-8][8]=true;
  if(v>=7){const bits=bchTypeNumber(v);for(let i=0;i<18;i++){const mod=((bits>>i)&1)!==0;m[Math.floor(i/3)][i%3+n-11]=mod;m[i%3+n-11][Math.floor(i/3)]=mod}}
  let inc=-1,row=n-1,bit=7,bi=0;for(let col=n-1;col>0;col-=2){const cc=col<=6?col-1:col;while(true){for(const c of [cc,cc-1])if(m[row][c]===null){let dark=false;if(bi<bytes.length)dark=((bytes[bi]>>bit)&1)!==0;if(((row+c)&1)===0)dark=!dark;m[row][c]=dark;if(--bit<0){bi++;bit=7}}row+=inc;if(row<0||row>=n){row-=inc;inc=-inc;break}}}
  return m}
function encode(text){const input=new TextEncoder().encode(String(text));const v=fit(input),bytes=dataBytes(v,input);return{version:v,modules:makeMatrix(v,bytes)}}
global.QrLite={encode};
})(typeof window!=='undefined'?window:globalThis);
