async function unpack(url){
  const b64=(await (await fetch(url,{cache:'no-cache'})).text()).trim();
  const raw=atob(b64),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  if(typeof DecompressionStream==='undefined')throw new Error('This browser does not support the compressed Project V bundle.');
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}
try{
  const [css,js]=await Promise.all([unpack('./styles-v2.css.gz.b64'),unpack('./src/game-v2.js.gz.b64')]);
  const style=document.createElement('style');style.textContent=css;document.head.append(style);
  const url=URL.createObjectURL(new Blob([js],{type:'text/javascript'}));
  await import(url);URL.revokeObjectURL(url);
}catch(error){
  console.error('Project V bootstrap failed:',error);
  document.body.innerHTML='<main style="min-height:100vh;background:#0b0d10;color:#fff;font-family:-apple-system,BlinkMacSystemFont,system-ui;padding:28px"><h1>Project V</h1><p>The game bundle could not start in this browser.</p><pre style="white-space:pre-wrap;color:#ffb4ab">'+String(error?.message||error)+'</pre></main>';
}
