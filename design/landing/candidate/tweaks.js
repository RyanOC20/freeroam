/* Freeroam candidate — live tweaks panel.
   Chrome for iterating only; it never writes files. Picks are baked into
   tokens.css by the design-loop command when you say "bake these". */
(function(){
  const root=document.documentElement;
  const DEFAULTS={
    '--cobalt':'#000000','--free-accent':'#1c30e0',
    '--radius':'18px','--font-display':"'Archivo Expanded','Archivo',sans-serif"
  };
  const FONTS={
    'Archivo Expanded':"'Archivo Expanded','Archivo',sans-serif",
    'Schibsted Grotesk':"'Schibsted Grotesk',sans-serif",
    'Newsreader':"'Newsreader',serif"
  };
  const PRESETS={
    cobalt:['#000000','#1c30e0','#4f46e5','#7c3aed','#10b981','#e11d48'],
    free:['#1c30e0','#bcd0ff','#ffffff','#b8f2e6','#ffd8b0','#ffe08a']
  };
  const set=(k,v)=>root.style.setProperty(k,v);
  const cur=k=>getComputedStyle(root).getPropertyValue(k).trim();

  const wrap=document.createElement('div');
  wrap.id='tw-panel';
  wrap.innerHTML=`
    <button id="tw-toggle" aria-label="Toggle tweaks panel" title="Tweaks (T)">✦</button>
    <div id="tw-body" role="region" aria-label="Design tweaks">
      <div class="tw-h">Tweaks<span>live · not saved</span></div>

      <div class="tw-row"><label>Theme</label>
        <div class="tw-seg" data-seg="theme">
          <button data-v="field" class="on">Field</button><button data-v="stage">Stage</button>
        </div>
      </div>

      <div class="tw-row"><label>Accent</label>
        <div class="tw-cin"><span class="tw-cwrap"><input type="color" id="tw-cobalt"></span><input type="text" id="tw-cobalt-x" class="tw-hex" spellcheck="false" maxlength="7" aria-label="Accent hex"></div>
      </div>
      <div class="tw-swatches" data-for="cobalt"></div>

      <div class="tw-row"><label>“Free” line</label>
        <div class="tw-cin"><span class="tw-cwrap"><input type="color" id="tw-free"></span><input type="text" id="tw-free-x" class="tw-hex" spellcheck="false" maxlength="7" aria-label="Free line hex"></div>
      </div>
      <div class="tw-swatches" data-for="free"></div>

      <div class="tw-row"><label>Display font</label>
        <select id="tw-font">
          <option value="Archivo Expanded">Archivo Expanded</option>
          <option value="Schibsted Grotesk">Schibsted Grotesk</option>
          <option value="Newsreader">Newsreader</option>
        </select>
      </div>

      <div class="tw-row"><label>Corner radius <b id="tw-rad-v">18</b></label><input type="range" id="tw-rad" min="0" max="30" step="1"></div>

      <div class="tw-actions">
        <button id="tw-reset">Reset</button>
        <button id="tw-copy" class="prim">Copy my picks</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const css=document.createElement('style');
  css.textContent=`
  #tw-panel{position:fixed;z-index:100000;right:16px;bottom:16px;font-family:'IBM Plex Mono',ui-monospace,monospace}
  #tw-toggle{width:44px;height:44px;border-radius:50%;border:0;cursor:pointer;font-size:17px;
    background:#0b0e26;color:#fff;box-shadow:0 10px 30px -8px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,255,255,.14);float:right}
  #tw-body{width:270px;max-height:82vh;overflow:auto;margin-bottom:10px;padding:14px;border-radius:16px;
    background:rgba(11,14,38,.94);backdrop-filter:blur(18px);color:#e9ecff;
    box-shadow:0 24px 60px -20px rgba(0,0,0,.7),inset 0 0 0 1px rgba(255,255,255,.12);display:none}
  #tw-panel.open #tw-body{display:block}
  .tw-h{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:600;margin-bottom:12px;letter-spacing:.02em}
  .tw-h span{font-size:9.5px;color:#7f88c0;letter-spacing:.1em;text-transform:uppercase}
  .tw-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:9px 0}
  .tw-row label{font-size:11px;color:#aab2e6;letter-spacing:.02em;display:flex;gap:6px;align-items:baseline}
  .tw-row label b{color:#fff;font-weight:600;font-size:11px}
  .tw-row input[type=range]{width:120px;accent-color:var(--cobalt,#1c30e0)}
  .tw-row select{background:#161a3d;color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:7px;font:inherit;font-size:11px;padding:5px 7px;cursor:pointer}
  .tw-cin{display:flex;align-items:center;gap:8px}
  .tw-cwrap{position:relative;width:26px;height:26px;border-radius:6px;overflow:hidden;flex:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)}
  .tw-cwrap input[type=color]{position:absolute;inset:-6px;width:calc(100% + 12px);height:calc(100% + 12px);padding:0;border:0;background:none;cursor:pointer}
  .tw-cwrap input[type=color]::-webkit-color-swatch-wrapper{padding:0}
  .tw-cwrap input[type=color]::-webkit-color-swatch{border:0}
  .tw-hex{width:82px;background:#161a3d;color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:7px;font:inherit;font-size:11px;padding:5px 7px}
  .tw-swatches{display:flex;gap:6px;margin:-2px 0 10px;justify-content:flex-end}
  .tw-swatches button{width:19px;height:19px;border-radius:5px;border:1px solid rgba(255,255,255,.2);cursor:pointer;padding:0}
  .tw-seg{display:flex;background:#161a3d;border-radius:8px;padding:2px}
  .tw-seg button{border:0;background:transparent;color:#aab2e6;font:inherit;font-size:11px;padding:5px 11px;border-radius:6px;cursor:pointer}
  .tw-seg button.on{background:#fff;color:#0b0e26}
  .tw-actions{display:flex;gap:8px;margin-top:14px}
  .tw-actions button{flex:1;border:0;border-radius:9px;padding:9px;font:inherit;font-size:11px;font-weight:600;cursor:pointer;
    background:#161a3d;color:#e9ecff}
  .tw-actions button.prim{background:#fff;color:#0b0e26}
  #tw-panel :focus-visible{outline:2px solid #8ea2ff;outline-offset:2px}
  @media(max-width:520px){#tw-body{width:min(84vw,270px)}}`;
  document.head.appendChild(css);

  const $=s=>wrap.querySelector(s);
  // toggle
  $('#tw-toggle').addEventListener('click',()=>wrap.classList.toggle('open'));
  addEventListener('keydown',e=>{if(e.key==='t'&&!/input|select|textarea/i.test(document.activeElement.tagName))wrap.classList.toggle('open')});

  function hex(c){c=c.trim();if(c[0]==='#')return c.length===4?'#'+[...c.slice(1)].map(x=>x+x).join(''):c;
    const m=c.match(/\d+/g);return m?'#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join(''):null;}
  const valid=v=>/^#[0-9a-fA-F]{6}$/.test(v);

  // ---- color controls (native swatch + hex field + preset dots) ----
  const cobaltEl=$('#tw-cobalt'),cobaltHex=$('#tw-cobalt-x'),freeEl=$('#tw-free'),freeHex=$('#tw-free-x');
  function applyColor(varName,v,colorEl,hexEl){
    if(!valid(v))return;v=v.toLowerCase();set(varName,v);colorEl.value=v;hexEl.value=v;
  }
  function bindColor(varName,colorEl,hexEl){
    const on=e=>applyColor(varName,e.target.value,colorEl,hexEl);
    colorEl.addEventListener('input',on);colorEl.addEventListener('change',on);
    hexEl.addEventListener('input',e=>{let v=e.target.value.trim();if(v&&v[0]!=='#')v='#'+v;
      if(valid(v)){v=v.toLowerCase();set(varName,v);colorEl.value=v;}});
  }
  function buildSwatches(key,varName,colorEl,hexEl){
    const host=wrap.querySelector('.tw-swatches[data-for="'+key+'"]');
    PRESETS[key].forEach(col=>{const b=document.createElement('button');b.type='button';
      b.style.background=col;b.title=col;
      b.addEventListener('click',()=>applyColor(varName,col,colorEl,hexEl));host.appendChild(b);});
  }
  bindColor('--cobalt',cobaltEl,cobaltHex);
  bindColor('--free-accent',freeEl,freeHex);
  buildSwatches('cobalt','--cobalt',cobaltEl,cobaltHex);
  buildSwatches('free','--free-accent',freeEl,freeHex);

  function initVals(){
    const cc=hex(cur('--cobalt'))||'#000000',fc=hex(cur('--free-accent'))||'#1c30e0';
    cobaltEl.value=cc;cobaltHex.value=cc;freeEl.value=fc;freeHex.value=fc;
  }

  // font
  $('#tw-font').addEventListener('change',e=>set('--font-display',FONTS[e.target.value]));
  // corner radius
  const rad=$('#tw-rad');rad.value=18;
  rad.addEventListener('input',e=>{const v=+e.target.value;$('#tw-rad-v').textContent=v;set('--radius',v+'px');});
  // theme
  wrap.querySelectorAll('[data-seg="theme"] button').forEach(b=>b.addEventListener('click',()=>{
    wrap.querySelectorAll('[data-seg="theme"] button').forEach(x=>x.classList.toggle('on',x===b));
    if(b.dataset.v==='stage')root.setAttribute('data-theme','stage');else root.removeAttribute('data-theme');
    initVals();
  }));
  // reset
  $('#tw-reset').addEventListener('click',()=>{
    for(const k in DEFAULTS)root.style.removeProperty(k);
    root.removeAttribute('data-theme');
    rad.value=18;$('#tw-rad-v').textContent=18;$('#tw-font').value='Archivo Expanded';
    wrap.querySelectorAll('[data-seg="theme"] button').forEach(x=>x.classList.toggle('on',x.dataset.v==='field'));
    initVals();
  });
  // copy picks
  $('#tw-copy').addEventListener('click',()=>{
    const picks={
      theme:root.getAttribute('data-theme')||'field',
      '--cobalt':cobaltEl.value,'--free-accent':freeEl.value,
      '--font-display':FONTS[$('#tw-font').value],'--radius':rad.value+'px'
    };
    const txt=JSON.stringify(picks,null,2);
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(
      ()=>{$('#tw-copy').textContent='Copied ✓';setTimeout(()=>$('#tw-copy').textContent='Copy my picks',1400);},
      ()=>console.log('[tweaks] picks:\n'+txt)
    );
    console.log('[tweaks] picks:\n'+txt);
  });

  initVals();
})();
