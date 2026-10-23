// 360 LIFE story B-roll for the long video: one moment = the base video segment plus an
// animated, Telugu-labelled graphic whose labels appear when the speaker says them.
// "above-you": a panel over the top of the frame (face + burned captions stay visible).
// "full-screen": covers everything above the caption band (captions stay visible).
import React from 'react';
import {AbsoluteFill,Composition,OffthreadVideo,interpolate,registerRoot,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';

const NAVY='#0B1C2C',AMBER='#FFD166',INK='#FFFFFF',TEAL='#4FD1C5',DIM='#7f93a8',RED='#FF6B6B';
const FONT='Nirmala UI, Segoe UI, sans-serif';
type L={text:string,at:number};
const vlen=(t:string)=>t.replace(/[ఀ-ఃా-్ౕౖ‌‍]/g,'').length;
const fit=(t:string,w:number,max:number)=>Math.min(max,w/Math.max(2,vlen(t))*1.05);

const useReveal=()=>{const f=useCurrentFrame();return (at:number,len=10)=>interpolate(f,[at,at+len],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});};
const T=({x,y,s=40,c=INK,o=1,w=700,a='middle',children}:any)=><text x={x} y={y} fontSize={s} fill={c} opacity={o} fontWeight={w} textAnchor={a} fontFamily={FONT} dominantBaseline="middle">{children}</text>;
const Arrow=({x1,y1,x2,y2,o=1,c=AMBER}:any)=>{const a=Math.atan2(y2-y1,x2-x1),h=16;return <g opacity={o} stroke={c} strokeWidth={5} fill="none" strokeLinecap="round"><line x1={x1} y1={y1} x2={x2} y2={y2}/><polyline points={`${x2-h*Math.cos(a-0.5)},${y2-h*Math.sin(a-0.5)} ${x2},${y2} ${x2-h*Math.cos(a+0.5)},${y2-h*Math.sin(a+0.5)}`}/></g>;};
const Person=({x,y,s=1,c=INK,o=1}:any)=><g transform={`translate(${x},${y}) scale(${s})`} opacity={o} stroke={c} strokeWidth={5} fill="none" strokeLinecap="round"><circle cx={0} cy={-62} r={18}/><path d="M0 -42 L0 10 M0 -30 L-24 -6 M0 -30 L24 -6 M0 10 L-18 52 M0 10 L18 52"/></g>;
const Alien=({x,y,s=1,o=1,wave=0}:any)=><g transform={`translate(${x},${y}) scale(${s})`} opacity={o}><ellipse cx={0} cy={-60} rx={30} ry={26} fill={TEAL}/><circle cx={-11} cy={-62} r={8} fill={NAVY}/><circle cx={11} cy={-62} r={8} fill={NAVY}/><path d="M-14 -84 L-22 -104 M14 -84 L22 -104" stroke={TEAL} strokeWidth={4}/><circle cx={-22} cy={-106} r={5} fill={AMBER}/><circle cx={22} cy={-106} r={5} fill={AMBER}/><rect x={-20} y={-34} width={40} height={50} rx={14} fill={TEAL}/><path d={`M20 -20 L${40+wave*6} ${-40-wave*10}`} stroke={TEAL} strokeWidth={8} strokeLinecap="round"/><path d="M-10 16 L-12 40 M10 16 L12 40" stroke={TEAL} strokeWidth={8} strokeLinecap="round"/></g>;
const Car=({x,y,s=1,o=1,crown=0}:any)=><g transform={`translate(${x},${y}) scale(${s})`} opacity={o}><rect x={-80} y={-34} width={160} height={40} rx={12} fill={AMBER}/><path d="M-46 -34 L-28 -64 L30 -64 L50 -34 Z" fill={AMBER}/><rect x={-22} y={-58} width={22} height={20} fill={NAVY}/><rect x={6} y={-58} width={24} height={20} fill={NAVY}/><circle cx={-48} cy={8} r={16} fill={NAVY} stroke={INK} strokeWidth={5}/><circle cx={48} cy={8} r={16} fill={NAVY} stroke={INK} strokeWidth={5}/>{crown>0&&<polygon opacity={crown} points="-26,-72 -18,-100 -4,-80 8,-104 20,-80 32,-100 34,-72" fill={AMBER} stroke={INK} strokeWidth={3}/>}</g>;
const Star=({x,y,r=10,o=1}:any)=><polygon opacity={o} fill={AMBER} points={[0,1,2,3,4,5,6,7,8,9].map(i=>{const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*0.45:r;return `${x+rr*Math.cos(a)},${y+rr*Math.sin(a)}`;}).join(' ')}/>;
const Box=({x,y,w,h,label,o,hl=false,s=34}:any)=><g opacity={o}><rect x={x-w/2} y={y-h/2} width={w} height={h} rx={16} fill={hl?AMBER:'#13283d'} stroke={hl?AMBER:'#2f4a66'} strokeWidth={3}/><T x={x} y={y} s={s} c={hl?NAVY:INK}>{label}</T></g>;

// ---------- templates (viewBox 1000 x H) ----------
const Flow=({L,H,p}:any)=>{const r=useReveal(),n=L.length,w=1000/n,y=p.sub?H*0.42:H*0.5;
 return <g>{L.map((l:L,i:number)=><g key={i}><Box x={w*i+w/2} y={y} w={w-60} h={Math.min(120,H*0.36)} label={l.text} o={r(l.at)} hl={i===n-1&&p.lastHighlight} s={fit(l.text,w-90,44)}/>{p.sub&&<T x={w*i+w/2} y={y+H*0.3} s={fit(p.sub[i],w-30,30)} c={DIM} o={r(l.at+6)} w={500}>{p.sub[i]}</T>}{i>0&&<Arrow x1={w*i-22} y1={y} x2={w*i+22} y2={y} o={r(l.at)}/>}</g>)}</g>;};
const Ladder=({L,H,p}:any)=>{const r=useReveal(),n=L.length,sw=860/n;
 return <g>{L.map((l:L,i:number)=>{const x=70+sw*i,y=H*0.82-(H*0.6/n)*(i+1);return <g key={i} opacity={r(l.at)}><path d={`M${x} ${H*0.88} L${x} ${y} L${x+sw-10} ${y}`} stroke={AMBER} strokeWidth={6} fill="none"/><T x={x+sw/2} y={y-28} s={38}>{l.text}</T></g>;})}
 {p.back&&<g opacity={r(p.backAt)}><Arrow x1={900} y1={H*0.2} x2={160} y2={H*0.9} c={RED}/><T x={560} y={H*0.66} s={30} c={RED}>{p.back}</T></g>}</g>;};
const Balance=({L,H,p}:any)=>{const r=useReveal(),f=useCurrentFrame(),tilt=interpolate(f,[p.tiltAt,p.tiltAt+20],[0,p.heavy==='left'?-12:12],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}),cy=H*0.42;
 return <g><path d={`M500 ${cy} L460 ${H*0.92} L540 ${H*0.92} Z`} fill="#2f4a66"/><g transform={`rotate(${tilt} 500 ${cy})`}><line x1={140} y1={cy} x2={860} y2={cy} stroke={AMBER} strokeWidth={8}/>
 {[0,1].map(i=>{const x=i?760:240,l=L[i];return <g key={i} opacity={r(l.at)}><line x1={x} y1={cy} x2={x} y2={cy+50} stroke={INK} strokeWidth={3}/><path d={`M${x-110} ${cy+50} Q${x} ${cy+100} ${x+110} ${cy+50} Z`} fill="#13283d" stroke={INK} strokeWidth={3}/></g>;})}</g>
 {[0,1].map(i=>{const l=L[i];return <T key={'t'+i} x={i?720:250} y={i?H*0.82:H*0.9} s={fit(l.text,i?520:380,38)} c={i?AMBER:INK} o={r(l.at)}>{l.text}</T>;})}
 {L[2]&&<T x={500} y={H*0.12} s={36} c={AMBER} o={r(L[2].at)}>{L[2].text}</T>}</g>;};
const Loop=({L,H,p}:any)=>{const r=useReveal(),f=useCurrentFrame(),cx=500,cy=H*0.5,R=Math.min(H*0.36,330),spin=f*(p.spin??2);const crack=p.crackAt!=null?interpolate(f,[p.crackAt,p.crackAt+20],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}):0;
 const nodes=L.slice(0,3),rx=H<600?380:R,ry=H<600?H*0.3:R;return <g><g transform={`rotate(${spin} ${cx} ${cy})`} opacity={1-crack*0.6}><ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#2f4a66" strokeWidth={6} strokeDasharray="30 20"/></g>
 {nodes.map((l:L,i:number)=>{const a=-Math.PI/2+i*2*Math.PI/3+(crack*(i===0?-0.5:i===1?0.5:0));const x=cx+rx*Math.cos(a),y=cy+ry*Math.sin(a);return <Box key={i} x={x} y={y} w={R>200?270:220} h={R>200?100:80} label={l.text} o={r(l.at)} s={R>200?42:34}/>;})}
 {[0,1,2].map(i=>{const a=-Math.PI/2+i*2*Math.PI/3+Math.PI/3;const x=cx+rx*Math.cos(a),y=cy+ry*Math.sin(a),t=a+Math.PI/2;return <Arrow key={'a'+i} x1={x-24*Math.cos(t)} y1={y-24*Math.sin(t)} x2={x+24*Math.cos(t)} y2={y+24*Math.sin(t)} o={r(nodes[Math.min(i+1,nodes.length-1)]?.at??0)*(1-crack)}/>;})}
 {crack<1&&<circle cx={cx+rx*Math.cos(f*0.06*(p.spin??2))} cy={cy+ry*Math.sin(f*0.06*(p.spin??2))} r={12} fill={AMBER} opacity={r(nodes[2]?.at??0)*(1-crack)}/>}
 {L[3]&&<T x={cx} y={cy} s={44} c={AMBER} o={r(L[3].at)}>{L[3].text}</T>}
 {crack>0&&<g transform={`translate(${cx-60+crack*120},${cy+R-crack*(R*2+80)}) rotate(-20)`}><path d="M0 -40 L18 0 L18 50 L-18 50 L-18 0 Z" fill={INK}/><path d="M-10 52 L0 90 L10 52 Z" fill={AMBER}/></g>}
 {p.crackLabel&&<T x={cx} y={H*0.95} s={32} c={AMBER} o={crack}>{p.crackLabel}</T>}</g>;};
const Triangle=({L,H,p}:any)=>{const r=useReveal(),f=useCurrentFrame(),pts=[[500,H*0.17],[260,H*0.8],[740,H*0.8]],c=[500,H*0.6];
 const pull=p.extremeFrom!=null?interpolate(f,[p.extremeFrom,p.extremeFrom+20,p.extremeTo,p.extremeTo+20],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}):0;
 const mid=r(L[3]?.at??99999,20),dx=c[0]+(pts[0][0]-c[0])*pull*0.85,dy=c[1]+(pts[0][1]-c[1])*pull*0.85;
 return <g><polygon points={pts.map(q=>q.join(',')).join(' ')} fill="none" stroke={AMBER} strokeWidth={6} opacity={r(L[0].at)}/>
 {L.slice(0,3).map((l:L,i:number)=><g key={i} opacity={r(l.at)*(i&&pull?1-pull*0.7:1)}><circle cx={pts[i][0]} cy={pts[i][1]} r={16} fill={AMBER}/><T x={pts[i][0]+(i===1?-30:30)} y={pts[i][1]} s={36} a={i===1?'end':'start'}>{l.text}</T></g>)}
 <g opacity={Math.max(mid,pull)}><circle cx={dx} cy={dy} r={22} fill={TEAL}/>{L[3]&&<T x={dx} y={dy+40} s={28} c={TEAL} o={mid}>{L[3].text}</T>}</g>
 {p.extremeLabel&&<T x={24} y={H*0.08} s={26} a="start" c={RED} o={pull}>{p.extremeLabel}</T>}</g>;};
const Gauge=({L,H,p}:any)=>{const r=useReveal(),f=useCurrentFrame(),cx=500,cy=H*0.86,R=Math.min(H*0.7,420),n=L.length;
 const ang=(i:number)=>Math.PI+(i+0.5)*(Math.PI/n);let target=0;L.forEach((l:L,i:number)=>{if(f>=l.at)target=i;});
 const needle=interpolate(f,L.map((l:L)=>l.at),L.map((_:L,i:number)=>i),{extrapolateLeft:'clamp',extrapolateRight:'clamp'});const na=ang(n>1?needle:target);
 return <g><path d={`M${cx-R} ${cy} A${R} ${R} 0 0 1 ${cx+R} ${cy}`} fill="none" stroke="#2f4a66" strokeWidth={28}/>
 <path d={`M${cx+R*Math.cos(ang(n-1)-Math.PI/n/2)} ${cy+R*Math.sin(ang(n-1)-Math.PI/n/2)} A${R} ${R} 0 0 1 ${cx+R} ${cy}`} fill="none" stroke={RED} strokeWidth={28} opacity={r(L[n-1].at)}/>
 {L.map((l:L,i:number)=><T key={i} x={cx+(R-105)*Math.cos(ang(i))} y={cy+(R-105)*Math.sin(ang(i))} s={30} o={r(l.at)} c={i===n-1?RED:INK}>{l.text}</T>)}
 <line x1={cx} y1={cy} x2={cx+(R-20)*Math.cos(na)} y2={cy+(R-20)*Math.sin(na)} stroke={AMBER} strokeWidth={8} strokeLinecap="round"/><circle cx={cx} cy={cy} r={16} fill={AMBER}/>
 {p.title&&<T x={cx} y={H*0.08} s={34} c={AMBER} o={r(L[n-1].at)}>{p.title}</T>}</g>;};
const Battery=({L,H,p}:any)=>{const r=useReveal(),f=useCurrentFrame(),{durationInFrames}=useVideoConfig(),lvl=interpolate(f,[10,durationInFrames-20],[1,0.08],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}),w=240,h=Math.min(H*0.78,420),x=380-w/2,y=H/2-h/2;
 return <g><rect x={x} y={y} width={w} height={h} rx={34} fill="none" stroke={INK} strokeWidth={6}/><rect x={x+18} y={y+18+(h-36)*(1-lvl)} width={w-36} height={(h-36)*lvl} rx={18} fill={lvl<0.3?RED:TEAL}/>
 {[0,1,2].map(i=><rect key={i} x={x+40} y={y+40+((f*3+i*60)%(h-120))} width={w-80} height={40} rx={8} fill={INK} opacity={0.18}/>)}
 {L.map((l:L,i:number)=><T key={i} x={620} y={H*0.3+i*H*0.22} s={40} a="start" o={r(l.at)} c={i===L.length-1?AMBER:INK}>{l.text}</T>)}</g>;};
const BoxIn=({L,H,p}:any)=>{const f=useCurrentFrame(),r=useReveal(),cx=500,cy=H*0.55,s=Math.min(H*0.32,170),d=(k:number)=>interpolate(f,[L[0].at+k*8,L[0].at+k*8+8],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const sides=[[cx-s,cy-s,cx+s,cy-s],[cx+s,cy-s,cx+s,cy+s],[cx+s,cy+s,cx-s,cy+s],[cx-s,cy+s,cx-s,cy-s]];
 return <g>{L[1]&&<rect x={0} y={0} width={1000} height={H} fill={AMBER} opacity={0.12*r(L[1].at,20)}/>}<Person x={cx} y={cy+40} s={Math.min(1.2,H/500)}/>
 {sides.map((q,i)=>{const k=d(i);return <line key={i} x1={q[0]} y1={q[1]} x2={q[0]+(q[2]-q[0])*k} y2={q[1]+(q[3]-q[1])*k} stroke={AMBER} strokeWidth={8} strokeLinecap="round"/>;})}
 <T x={cx} y={H*0.1} s={38} o={r(L[0].at)}>{L[0].text}</T>{L[1]&&<T x={cx+s+150} y={cy} s={34} c={AMBER} o={r(L[1].at)}>{L[1].text}</T>}</g>;};
const Curve=({L,H,p}:any)=>{const f=useCurrentFrame(),r=useReveal(),k=interpolate(f,[L[0].at,L[1].at],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}),len=1300;
 return <g><path d={`M100 ${H*0.85} C 400 ${H*0.85}, 500 ${H*0.75}, 900 ${H*0.15}`} fill="none" stroke={AMBER} strokeWidth={8} strokeDasharray={len} strokeDashoffset={len*(1-k)} strokeLinecap="round"/>
 <circle cx={100} cy={H*0.85} r={14} fill={INK} opacity={r(L[0].at)}/><T x={110} y={H*0.85-44} s={34} a="start" o={r(L[0].at)}>{L[0].text}</T>
 <Star x={900} y={H*0.15} r={26} o={r(L[1].at)}/><T x={880} y={H*0.15+56} s={34} a="end" c={AMBER} o={r(L[1].at)}>{L[1].text}</T>
 {L[2]&&<g opacity={r(L[2].at)}><Person x={330} y={H*0.86} s={Math.min(0.9,H/600)} c={TEAL}/><T x={330} y={H*0.5} s={30} c={TEAL}>{L[2].text}</T></g>}</g>;};
const Views=({L,H,p}:any)=>{const r=useReveal(),f=useCurrentFrame(),cy=H*0.52,s=Math.min(H*0.28,150),spin=Math.sin(f/20)*0.15;
 return <g><g opacity={r(L[0].at)}><ellipse cx={270} cy={cy} rx={s} ry={s} fill="none" stroke={AMBER} strokeWidth={7}/><T x={270} y={H*0.1} s={36}>{L[0].text}</T></g>
 <g opacity={r(L[1].at)}><rect x={730-s*0.9} y={cy-s*(1+spin)} width={s*1.8} height={s*2*(1+spin)} fill="none" stroke={TEAL} strokeWidth={7}/><T x={730} y={H*0.1} s={36}>{L[1].text}</T></g>
 {L[2]&&<T x={500} y={H*0.94} s={32} c={AMBER} o={r(L[2].at)}>{L[2].text}</T>}<T x={500} y={cy} s={40} c={DIM} o={r(L[1].at)}>≠</T></g>;};
const Compare=({L,H,p}:any)=>{const r=useReveal();const cols=[p.left,p.right];
 return <g>{cols.map((c:any,i:number)=><g key={i}><rect x={i?520:40} y={H*0.03} width={440} height={H*0.84} rx={20} fill="#13283d" stroke={i?AMBER:'#2f4a66'} strokeWidth={3} opacity={r(c.at)}/><T x={i?740:260} y={H*0.13} s={44} c={i?AMBER:INK} o={r(c.at)}>{c.title}</T>
 {c.rows.map((row:L,j:number)=><T key={j} x={i?740:260} y={H*0.3+j*(H*0.52/Math.max(4,c.rows.length))} s={fit(row.text,400,36)} o={r(row.at)} w={500}>{row.text}</T>)}</g>)}
 {p.ask&&<T x={500} y={H*0.935} s={30} c={AMBER} o={r(p.ask.at)}>{p.ask.text}</T>}</g>;};
const Title=({L,H}:any)=>{const r=useReveal();return <g>{L.map((l:L,i:number)=><T key={i} x={500} y={H*(L.length===1?0.5:0.32+i*0.36)} s={Math.min(54,1700/Math.max(10,l.text.length))} c={i?AMBER:INK} o={r(l.at)}>{l.text}</T>)}</g>;};
const Scene=({L,H,p}:any)=>{const r=useReveal(),f=useCurrentFrame(),k=p.kind;
 if(k==='aliens-arrive'){const land=interpolate(f,[0,30],[-H*0.6,0],{extrapolateRight:'clamp'});return <g>{[60,180,300,640,760,880].map((x,i)=><rect key={i} x={x} y={H*(0.55+(i%3)*0.08)} width={90} height={H} fill="#13283d"/>)}
  <g transform={`translate(0,${land})`}><Alien x={420} y={H*0.6} s={H/420} wave={Math.sin(f/6)}/><Alien x={560} y={H*0.6} s={H/440}/><rect x={600} y={H*0.42} width={60} height={46} rx={4} fill={INK} opacity={r(L[0].at)}/></g>
  {L.map((l:L,i:number)=><T key={i} x={500} y={H*(0.1+i*0.12)} s={36} c={i?AMBER:INK} o={r(l.at)}>{l.text}</T>)}</g>;}
 if(k==='owners'){const walk=interpolate(f,[0,p.parkAt??200],[0,1],{extrapolateRight:'clamp'}),x=200+walk*360,S=H>600?2.2:1.2;return <g><line x1={0} y1={H*0.78} x2={1000} y2={H*0.78} stroke="#2f4a66" strokeWidth={6}/>
  <rect x={640} y={H*0.78-140*S/2.2-20} width={330} height={140*S/2.2+20} fill="none" stroke={DIM} strokeWidth={4} strokeDasharray="14 10"/><T x={805} y={H*0.78-140*S/2.2-50} s={34} c={DIM} o={r(p.parkAt??0)}>{p.parkLabel}</T>
  <Car x={x+190} y={H*0.78-20*S} s={S} crown={r(L[0].at)}/><Person x={x-90} y={H*0.78-52*S/1.3} s={S/1.3} c={TEAL} o={r(L[1].at)}/>
  <T x={x+190} y={H*0.78-150*S} s={60} c={AMBER} o={r(L[0].at)}>{L[0].text}</T><T x={x-90} y={H*0.78-170*S/1.3} s={54} c={TEAL} o={r(L[1].at)}>{L[1].text}</T>
  <Alien x={110} y={H*0.3} s={S*0.8} o={0.9}/><Alien x={890} y={H*0.26} s={S*0.75} o={0.9} wave={Math.sin(f/8)}/>{L[2]&&<T x={500} y={H*0.92} s={34} o={r(L[2].at)}>{L[2].text}</T>}</g>;}
 if(k==='child-stars'){return <g>{Array.from({length:14},(_,i)=><Star key={i} x={(i*137)%960+20} y={(i*71)%(H*0.45)+20} r={8+(i%3)*4} o={0.4+0.6*Math.abs(Math.sin(f/15+i))}/>)}
  <Person x={420} y={H*0.86} s={H/560} c={INK}/><line x1={436} y1={H*0.86-60*H/560} x2={520} y2={H*0.86-150*H/560} stroke={INK} strokeWidth={5}/>
  <g opacity={r(L[0].at)}><Alien x={720} y={H*0.86} s={H/520} wave={Math.sin(f/7)}/><rect x={600} y={H*0.62} width={56} height={44} rx={4} fill={INK} transform={`translate(${-interpolate(f,[L[0].at+20,L[0].at+60],[0,120],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})},0)`}/></g>
  {L.map((l:L,i:number)=><T key={i} x={500} y={H*(0.12+i*0.16)} s={fit(l.text,700,40)} c={i?AMBER:INK} o={r(l.at)}>{l.text}</T>)}
  {Array.from({length:5},(_,i)=><T key={'q'+i} x={440+i*30} y={H*0.6-((f*2+i*40)%(H*0.4))} s={34} c={AMBER} o={0.7}>?</T>)}</g>;}
 return null;};
const TEMPLATES:any={flow:Flow,ladder:Ladder,balance:Balance,loop:Loop,triangle:Triangle,gauge:Gauge,battery:Battery,box:BoxIn,curve:Curve,views:Views,compare:Compare,title:Title,scene:Scene};

const Moment=(props:any)=>{const f=useCurrentFrame(),{durationInFrames,width,height}=useVideoConfig();
 const full=props.placement==='full-screen',panelH=full?height*0.8:height*0.3,panelW=full?width:width*0.94,top=full?0:height*0.015,left=(width-panelW)/2;
 const a0=Math.min(props.appearAt??0,durationInFrames-30),o=interpolate(f,[a0,a0+10,durationInFrames-10,durationInFrames],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}),H=1000*panelH/panelW;
 const Tpl=TEMPLATES[props.template];
 return <AbsoluteFill style={{backgroundColor:'black'}}>
  <OffthreadVideo muted src={staticFile(props.base)} startFrom={props.from}/>
  <div style={{position:'absolute',left,top,width:panelW,height:panelH,opacity:o,transform:`translateY(${(1-o)*-12}px)`,background:NAVY,borderRadius:full?0:14,boxShadow:full?'none':'0 6px 18px #0008',overflow:'hidden'}}>
   <svg viewBox={`0 0 1000 ${H}`} width="100%" height="100%">{Tpl?<Tpl L={props.labels} H={H} p={props.params??{}}/>:null}</svg>
  </div>
 </AbsoluteFill>;};

const Root=()=> <Composition id="LongBroll" component={Moment} width={608} height={702} fps={30} durationInFrames={30}
 defaultProps={{base:'base.mp4',from:0,duration:30,width:608,height:702,placement:'above-you',template:'title',labels:[],params:{}}}
 calculateMetadata={({props}:any)=>({durationInFrames:props.duration,width:props.width,height:props.height})}/>;
registerRoot(Root);
