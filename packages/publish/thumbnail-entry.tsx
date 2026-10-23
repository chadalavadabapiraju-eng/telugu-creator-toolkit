// 360 LIFE publish kit: YouTube long-video thumbnail (1280x720) and Shorts/Reels cover (1080x1920).
// House look (owner-approved 21 Oct 2026): black, red-orange burst with rays, host cut-out with a
// warm rim, heavy black-outlined Telugu text (white line + amber line), red tag, one story icon.
import React from 'react';
import {AbsoluteFill,Composition,Img,registerRoot,staticFile} from 'remotion';

const AMBER='#FFD166',TEAL='#4FD1C5',RED='#e3121b',FONT='Nirmala UI, Segoe UI, sans-serif';
const vlen=(t:string)=>(t??'').replace(/[ఀ-ఃా-్ౕౖ‌‍]/g,'').length;
const fit=(t:string,w:number,max:number)=>Math.min(max,w/Math.max(4,vlen(t)));
const outline={WebkitTextStroke:'6px #000',paintOrder:'stroke fill' as any};

// ---- story icons (add new kinds here; keep them simple, bold, and readable at phone size) ----
export const Icon=({kind}:{kind:string})=>{
 if(kind==='ufo-cap')return <svg width={300} height={300} viewBox="140 400 300 300"><defs><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7CFFB2" stopOpacity="0.85"/><stop offset="1" stopColor="#7CFFB2" stopOpacity="0.05"/></linearGradient><radialGradient id="qg"><stop offset="0" stopColor={AMBER} stopOpacity="0.9"/><stop offset="1" stopColor={AMBER} stopOpacity="0"/></radialGradient></defs>
  <polygon points="250,452 330,452 430,700 150,700" fill="url(#beam)"/><ellipse cx={290} cy={440} rx={110} ry={26} fill="#9aa6b2" stroke="#e8eef4" strokeWidth={4}/><ellipse cx={290} cy={424} rx={52} ry={34} fill={TEAL} opacity={0.9}/>
  {[-70,-35,0,35,70].map((d,i)=><circle key={i} cx={290+d} cy={444} r={6} fill={i%2?AMBER:'#ff5a5a'}/>)}<circle cx={290} cy={590} r={120} fill="url(#qg)"/>
  <polygon points="180,600 290,560 400,600 290,640" fill="#111" stroke={AMBER} strokeWidth={4}/><path d="M220 618 L220 660 Q290 690 360 660 L360 618" fill="#111" stroke={AMBER} strokeWidth={4}/>
  <path d="M290 562 L276 590 L298 606 L280 640" stroke="#ff4040" strokeWidth={5} fill="none"/><line x1={400} y1={600} x2={400} y2={650} stroke={AMBER} strokeWidth={4}/><circle cx={400} cy={655} r={7} fill={AMBER}/>
  <text x={290} y={548} textAnchor="middle" fontSize={120} fontWeight={900} fill={AMBER} stroke="#000" strokeWidth={5} fontFamily={FONT}>?</text></svg>;
 if(kind==='balance')return <svg width={620} height={360} viewBox="0 0 620 360"><polygon points="310,110 270,340 350,340" fill="#333" stroke={AMBER} strokeWidth={4}/>
  <g transform="rotate(-12 310 110)"><line x1={40} y1={110} x2={580} y2={110} stroke={AMBER} strokeWidth={10}/><path d="M60 110 Q130 200 200 110 Z" fill="#111" stroke="#fff" strokeWidth={4}/><rect x={100} y={40} width={60} height={100} rx={10} fill="#222" stroke={AMBER} strokeWidth={5}/>
   <text x={130} y={34} textAnchor="middle" fontSize={34} fill={AMBER}>★★★★★</text><path d="M420 110 Q490 200 560 110 Z" fill="#111" stroke="#fff" strokeWidth={4}/><text x={490} y={95} textAnchor="middle" fontSize={110} fontWeight={900} fill={RED} stroke="#000" strokeWidth={4}>?</text></g></svg>;
 if(kind==='rocket')return <svg width={520} height={420} viewBox="0 0 520 420"><circle cx={260} cy={210} r={180} fill="none" stroke="#ff4d1f" strokeWidth={8} strokeDasharray="30 18"/>
  <g transform="translate(260 210) rotate(35)"><path d="M0 -150 Q46 -90 46 20 L46 90 L-46 90 L-46 20 Q-46 -90 0 -150 Z" fill="#f2f2f2" stroke="#000" strokeWidth={5}/><circle cx={0} cy={-40} r={22} fill={TEAL} stroke="#000" strokeWidth={4}/><path d="M-46 50 L-86 110 L-46 90 Z M46 50 L86 110 L46 90 Z" fill={RED}/><path d="M-30 92 L0 190 L30 92 Z" fill={AMBER}/></g>
  <line x1={60} y1={60} x2={460} y2={360} stroke={RED} strokeWidth={22} strokeLinecap="round"/></svg>;
 if(kind==='train')return <svg width={640} height={420} viewBox="0 0 640 420"><path d="M120 380 A220 220 0 0 1 520 380" fill="none" stroke="#333" strokeWidth={34}/><path d="M440 236 A220 220 0 0 1 520 380" fill="none" stroke={RED} strokeWidth={34}/><line x1={320} y1={380} x2={480} y2={250} stroke={AMBER} strokeWidth={12} strokeLinecap="round"/><circle cx={320} cy={380} r={20} fill={AMBER}/>
  <g transform="translate(70 260)"><rect x={0} y={20} width={150} height={70} rx={10} fill="#222" stroke={AMBER} strokeWidth={5}/><rect x={100} y={-20} width={50} height={40} fill="#222" stroke={AMBER} strokeWidth={5}/><rect x={20} y={-10} width={24} height={30} fill="#222" stroke={AMBER} strokeWidth={4}/><circle cx={20} cy={-30} r={14} fill="#888"/><circle cx={0} cy={-56} r={20} fill="#aaa"/><circle cx={35} cy={100} r={18} fill="#111" stroke="#fff" strokeWidth={4}/><circle cx={115} cy={100} r={18} fill="#111" stroke="#fff" strokeWidth={4}/></g></svg>;
 if(/^number-\d+$/.test(kind)){const n=kind.split('-')[1];return <svg width={560} height={440} viewBox="0 0 560 440"><text x={280} y={380} textAnchor="middle" fontSize={460} fontWeight={900} fill={AMBER} stroke="#000" strokeWidth={10} fontFamily={FONT}>{n}</text>
  {Array.from({length:Math.min(5,Number(n))},(_,i)=><g key={i} transform={`translate(${280+(i-(Math.min(5,Number(n))-1)/2)*190} 400)`}><circle r={26} fill={TEAL} stroke="#000" strokeWidth={4}/><path d="M-12 0 L-3 10 L14 -10" stroke="#000" strokeWidth={6} fill="none"/></g>)}</svg>;}
 if(kind==='stamp')return <svg width={560} height={420} viewBox="0 0 560 420"><g transform="rotate(-14 280 210)"><rect x={60} y={110} width={440} height={180} rx={20} fill="none" stroke={RED} strokeWidth={14}/><text x={280} y={230} textAnchor="middle" fontSize={92} fontWeight={900} fill={RED} fontFamily={FONT}>సక్సెస్</text></g>
  <line x1={70} y1={60} x2={490} y2={370} stroke="#fff" strokeWidth={24} strokeLinecap="round"/><line x1={70} y1={60} x2={490} y2={370} stroke="#000" strokeWidth={8} strokeLinecap="round"/></svg>;
 return null;};

const Burst=({x,y,size}:any)=><>
 <div style={{position:'absolute',left:x-size*0.56,top:y-size*0.56,width:size*1.12,height:size*1.12,borderRadius:'50%',background:'repeating-conic-gradient(from 0deg, #ff3b1f22 0deg 6deg, transparent 6deg 14deg)'}}/>
 <div style={{position:'absolute',left:x-size/2,top:y-size/2,width:size,height:size,borderRadius:'50%',background:'radial-gradient(circle, #ffb02ecc 0%, #ff4d1f99 22%, #b0101066 44%, transparent 66%)'}}/></>;
const rim='drop-shadow(0 0 3px #fff) drop-shadow(0 0 20px #ff7a1fcc) drop-shadow(0 20px 30px #000)';

const LongThumb=({line1,line2,note,kind,photo}:any)=><AbsoluteFill style={{background:'#050505',fontFamily:FONT,overflow:'hidden'}}>
 <Burst x={1130} y={350} size={1100}/>
 <Img src={staticFile(photo)} style={{position:'absolute',right:-70,bottom:-60,height:800,filter:rim}}/>
 <div style={{position:'absolute',left:110,top:390}}><Icon kind={kind}/></div>
 <Img src={staticFile('wordmark.png')} style={{position:'absolute',right:28,top:24,width:170}}/>
 <div style={{position:'absolute',left:40,top:36,width:780,lineHeight:1.05}}>
  <div style={{whiteSpace:'nowrap',fontSize:fit(line1,760,118),fontWeight:900,color:'#fff',...outline,textShadow:'0 8px 0 #000'}}>{line1}</div>
  <div style={{whiteSpace:'nowrap',fontSize:fit(line2,760,118),fontWeight:900,color:AMBER,...outline,textShadow:'0 8px 0 #000, 0 0 30px #ff7a1f'}}>{line2}</div>
  {note&&<div style={{marginTop:14,display:'inline-block',fontSize:42,fontWeight:900,color:'#fff',background:RED,borderRadius:10,padding:'4px 20px',transform:'rotate(-2deg)',boxShadow:'0 6px 0 #000'}}>{note}</div>}
 </div>
</AbsoluteFill>;

const ShortCover=({line1,line2,note,kind,photo,badge}:any)=><AbsoluteFill style={{background:'#050505',fontFamily:FONT,overflow:'hidden'}}>
 <Burst x={540} y={1620} size={1600}/>
 <Img src={staticFile(photo)} style={{position:'absolute',left:'50%',transform:'translateX(-50%)',bottom:-40,height:760,filter:rim}}/>
 <Img src={staticFile('wordmark.png')} style={{position:'absolute',left:40,top:60,width:220}}/>
 {badge&&<div style={{position:'absolute',right:40,top:56,fontSize:46,fontWeight:900,color:'#000',background:AMBER,borderRadius:12,padding:'2px 18px'}}>{badge}</div>}
 <div style={{position:'absolute',left:0,right:0,top:250,textAlign:'center',lineHeight:1.08,padding:'0 40px'}}>
  <div style={{whiteSpace:'nowrap',fontSize:fit(line1,940,118),fontWeight:900,color:'#fff',...outline,textShadow:'0 8px 0 #000'}}>{line1}</div>
  <div style={{whiteSpace:'nowrap',fontSize:fit(line2,940,118),fontWeight:900,color:AMBER,...outline,textShadow:'0 8px 0 #000, 0 0 30px #ff7a1f'}}>{line2}</div>
  {note&&<div style={{marginTop:22,display:'inline-block',fontSize:56,fontWeight:900,color:'#fff',background:RED,borderRadius:12,padding:'6px 26px',transform:'rotate(-2deg)',boxShadow:'0 8px 0 #000'}}>{note}</div>}
 </div>
 <div style={{position:'absolute',left:0,right:0,top:650,display:'flex',justifyContent:'center',transform:'scale(0.85)',transformOrigin:'50% 0'}}><Icon kind={kind}/></div>
</AbsoluteFill>;

const dflt={line1:'',line2:'',note:'',kind:'',photo:'host.png',badge:''};
const Root=()=> <>
 <Composition id="LongThumb" component={LongThumb} width={1280} height={720} fps={30} durationInFrames={1} defaultProps={dflt}/>
 <Composition id="ShortCover" component={ShortCover} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={dflt}/>
</>;
registerRoot(Root);
