/* assets/js/app.js
   Shared logic for Home, Videos, Photos, Photobooth
*/

// small helper
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const STORAGE = {
  users: 'yl_users_v1',
  current: 'yl_current_v1',
  videos: 'yl_videos_v1',
  photos: 'yl_photos_v1',
  photobooth: 'yl_pb_v1'
};

/* ---------- AUTH simple (register/login stored as object in localStorage) ---------- */
window.AUTH = {
  seedDemo(){
    if(!localStorage.getItem(STORAGE.users)){
      const demo = [{name:'Yourceyj',email:'demo@love',pass:'demo'}];
      localStorage.setItem(STORAGE.users, JSON.stringify(demo));
    }
  },
  register(name,email,pass){
    const arr = JSON.parse(localStorage.getItem(STORAGE.users)||'[]');
    if(arr.find(u=>u.email===email)) return {ok:false,msg:'Email exists'};
    arr.push({name,email,pass}); localStorage.setItem(STORAGE.users, JSON.stringify(arr));
    localStorage.setItem(STORAGE.current, JSON.stringify({name,email}));
    return {ok:true};
  },
  login(email,pass){
    const arr = JSON.parse(localStorage.getItem(STORAGE.users)||'[]');
    const u = arr.find(x=>x.email===email && x.pass===pass);
    if(!u) return {ok:false,msg:'Invalid credentials'};
    localStorage.setItem(STORAGE.current, JSON.stringify({name:u.name,email:u.email}));
    return {ok:true};
  },
  logout(){
    localStorage.removeItem(STORAGE.current);
  },
  current(){ return JSON.parse(localStorage.getItem(STORAGE.current)||'null'); }
};

/* ---------- Home: film roll S-style layout ---------- */
function initFilmRoll(){
  const track = $('.film-track');
  if(!track) return;
  // position items on S curve visually using transform
  const items = Array.from(track.children);
  function applyS(){
    const mid = (items.length-1)/2;
    items.forEach((it,i)=>{
      const offset = i - mid;
      const rotate = offset * 6; // rotation
      const ty = Math.abs(offset) * -8; // small vertical staggering
      const scale = Math.max(0.86, 1 - Math.abs(offset)*0.06);
      it.style.transform = `translateY(${ty}px) rotate(${rotate}deg) scale(${scale})`;
      it.style.zIndex = `${100 - Math.abs(offset)}`;
    });
  }
  applyS();

  // left/right controls
  const left = document.querySelector('.slider-control.left');
  const right = document.querySelector('.slider-control.right');
  let idx = 0;
  function scrollTo(i){
    idx = Math.max(0, Math.min(i, items.length-1));
    const width = items[0].offsetWidth + 20;
    track.style.transform = `translateX(${ - (idx * width) + (track.parentElement.offsetWidth/2 - width/2) }px)`;
  }
  left?.addEventListener('click', ()=> scrollTo(idx-1));
  right?.addEventListener('click', ()=> scrollTo(idx+1));

  // item click navigation (data-page)
  items.forEach(it=>{
    it.addEventListener('click', ()=>{
      const page = it.dataset.page;
      if(page) window.location.href = page;
    });
  });

  // center first
  setTimeout(()=> scrollTo(0), 80);
}

/* ---------- Videos page: handle uploads, showing tiles, preview & download ---------- */
function initVideosPage(){
  const upload = $('#videoUpload');
  const list = $('#videoList');
  if(!upload || !list) return;
  // load saved
  const saved = JSON.parse(localStorage.getItem(STORAGE.videos)||'[]');
  function render(){
    list.innerHTML = '';
    const arr = JSON.parse(localStorage.getItem(STORAGE.videos)||'[]');
    arr.forEach((v, i)=>{
      const tile = document.createElement('div');
      tile.className = 'film-item';
      tile.innerHTML = `
        <div class="icon">🎬</div>
        <div style="width:100%;height:140px;border-radius:10px;overflow:hidden;background:#000">
          <video src="${v.data}" muted loop style="width:100%;height:100%;object-fit:cover"></video>
        </div>
        <p>${v.name||('Clip '+(i+1))}</p>
        <div class="meta">
          <button class="small btn-preview" data-index="${i}">Preview</button>
          <button class="small btn-download" data-index="${i}">Download</button>
        </div>
      `;
      list.appendChild(tile);
    });
    // wire buttons
    $$('.btn-preview').forEach(b=> b.addEventListener('click', (e)=>{
      const idx = +e.currentTarget.dataset.index;
      openVideoPopup(idx);
    }));
    $$('.btn-download').forEach(b=> b.addEventListener('click', (e)=>{
      const idx = +e.currentTarget.dataset.index;
      downloadVideo(idx);
    }));
  }
  render();

  upload.addEventListener('change', e=>{
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = function(ev){
      const arr = JSON.parse(localStorage.getItem(STORAGE.videos)||'[]');
      arr.push({name:f.name, type: f.type, data: ev.target.result, created:Date.now()});
      localStorage.setItem(STORAGE.videos, JSON.stringify(arr));
      render();
    };
    reader.readAsDataURL(f); // store dataURL
  });

  // popup
  const popup = $('#videoPopup');
  const popupVid = $('#popupVideo');
  function openVideoPopup(idx){
    const arr = JSON.parse(localStorage.getItem(STORAGE.videos)||'[]');
    const v = arr[idx];
    if(!v) return;
    popupVid.src = v.data;
    popup.classList.add('open');
    popupVid.play();
  }
  $('#videoPopupClose')?.addEventListener('click', ()=>{
    popupVid.pause(); popup.classList.remove('open'); popupVid.src='';
  });
  function downloadVideo(idx){
    const arr = JSON.parse(localStorage.getItem(STORAGE.videos)||'[]');
    const v = arr[idx]; if(!v) return;
    // create blob from dataURL
    const a = document.createElement('a');
    a.href = v.data;
    a.download = v.name || 'clip.mp4';
    a.click();
  }
}

/* ---------- Photobooth (client-side): upload + template overlay + download ---------- */
function initPhotobooth(){
  const file = $('#pbUpload'); const tpl = $('#pbTemplate'); const canvas = $('#pbCanvas'); const btnPreview = $('#pbPreview'); const btnDownload = $('#pbDownload');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 1000, H = 1333;
  canvas.width = W; canvas.height = H;
  let uploaded = null; let templateSrc = null;
  file?.addEventListener('change', e=>{
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ev => { uploaded = new Image(); uploaded.onload = render; uploaded.src = ev.target.result; }
    reader.readAsDataURL(f);
  });
  tpl?.addEventListener('change', ()=>{ templateSrc = tpl.value; render(); });
  btnPreview?.addEventListener('click', render);
  function render(){
    if(!ctx) return;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#081221'; ctx.fillRect(0,0,W,H);
    if(uploaded){
      // cover mode
      const r = Math.max(W/uploaded.width, H/uploaded.height);
      const nw = uploaded.width * r, nh = uploaded.height * r;
      const dx = (W - nw)/2, dy = (H - nh)/2;
      ctx.drawImage(uploaded, dx, dy, nw, nh);
    } else {
      ctx.fillStyle = '#112233'; ctx.fillRect(80,80,W-160,H-160);
      ctx.fillStyle = '#97a7b4'; ctx.font = '28px Inter'; ctx.fillText('Upload a photo to start', 120, H/2);
    }
    if(templateSrc && templateSrc!=='none'){
      const tplImg = new Image(); tplImg.crossOrigin='anonymous';
      tplImg.onload = ()=> ctx.drawImage(tplImg,0,0,W,H);
      tplImg.src = templateSrc;
    }
  }
  btnDownload?.addEventListener('click', ()=>{
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = 'photobooth.png'; a.click();
  });
}

/* ---------- Photos deck: create cards, swipe & drop to holders ---------- */
function initPhotosPage(){
  const deckEl = $('#deckArea'); if(!deckEl) return;
  // load saved photos or sample
  let photos = JSON.parse(localStorage.getItem(STORAGE.photos)||'[]');
  // if empty, add sample placeholders (user should add their images to assets/img and replace)
  if(!photos.length){
    photos = [
      {id:'p1', src:'assets/img/sample1.jpg', caption:'Beach day'},
      {id:'p2', src:'assets/img/sample2.jpg', caption:'Sunset'},
      {id:'p3', src:'assets/img/sample3.jpg', caption:'Cafe'},
      {id:'p4', src:'assets/img/sample4.jpg', caption:'Roadtrip'}
    ];
    localStorage.setItem(STORAGE.photos, JSON.stringify(photos));
  }
  // render deck (stack)
  const deck = $('#deck');
  if(!deck) return;
  deck.innerHTML = '';
  photos.slice().reverse().forEach((p, i)=>{
    const div = document.createElement('div');
    div.className = 'card';
    div.style.backgroundImage = `url('${p.src}')`;
    div.dataset.id = p.id;
    div.style.transform = `translate(-50%,-50%) translateY(${i*6}px) rotate(${(Math.random()-0.5)*6}deg)`;
    const caption = document.createElement('div'); caption.className='caption'; caption.textContent = p.caption || '';
    div.appendChild(caption);
    deck.appendChild(div);
    // drag support
    div.draggable = true;
    div.addEventListener('dragstart', e=>{
      e.dataTransfer.setData('text/plain', p.src);
    });
  });

  // make holders droppable
  $$('.holder').forEach(h=>{
    h.addEventListener('dragover', e=> e.preventDefault());
    h.addEventListener('drop', e=>{
      e.preventDefault();
      const src = e.dataTransfer.getData('text/plain');
      if(!src) return;
      h.innerHTML = `<img src="${src}" style="width:100%;height:auto;border-radius:8px">`;
      // persist holder content for this user
      const holders = JSON.parse(localStorage.getItem('yl_holders')||'{}');
      holders[h.dataset.id || 'h1'] = src;
      localStorage.setItem('yl_holders', JSON.stringify(holders));
    });
  });

  // restore holders
  const holdersSaved = JSON.parse(localStorage.getItem('yl_holders')||'{}');
  $$('.holder').forEach(h=>{
    const id = h.dataset.id || 'h1';
    if(holdersSaved[id]) h.innerHTML = `<img src="${holdersSaved[id]}" style="width:100%;height:auto;border-radius:8px">`;
  });

  // card swipe (left/right gestures): simple left pop
  let startX = 0, isDragging=false;
  deck.addEventListener('pointerdown', e=>{
    startX = e.pageX; isDragging=true;
  });
  window.addEventListener('pointerup', e=>{
    if(!isDragging) return;
    isDragging=false;
    const dx = e.pageX - startX;
    if(Math.abs(dx) > 80){
      // remove top card (last child in deck)
      const child = deck.lastElementChild;
      if(child) child.remove();
    }
  });
}

/* ---------- Small init on DOM ready ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  AUTH.seedDemo();
  initFilmRoll();
  initPhotobooth();
  initPhotosPage();
  initVideosPage();
});
