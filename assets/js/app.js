/* assets/js/app.js
   Unified script for auth, film-roll, videos, photobooth, photos deck, games.
   Uses localStorage for persistence.
*/

// helpers
const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
const STORAGE = {
  users: 'yl_users_v2',
  current: 'yl_current_v2',
  videos: 'yl_videos_v2',
  photos: 'yl_photos_v2',
  holders: 'yl_holders_v2',
  gameReviews: 'yl_reviews_v2'
};

// ---------- AUTH ----------
const AUTH = {
  seed(){
    if(!localStorage.getItem(STORAGE.users)){
      const demo=[{name:'Yourceyj', email:'demo@love', pass:'demo'}];
      localStorage.setItem(STORAGE.users, JSON.stringify(demo));
    }
  },
  register(name,email,pass){
    const arr=JSON.parse(localStorage.getItem(STORAGE.users)||'[]');
    if(arr.find(u=>u.email===email)) return {ok:false,msg:'Email already exists'};
    arr.push({name,email,pass}); localStorage.setItem(STORAGE.users, JSON.stringify(arr));
    localStorage.setItem(STORAGE.current, JSON.stringify({name,email}));
    return {ok:true};
  },
  login(email,pass){
    const arr=JSON.parse(localStorage.getItem(STORAGE.users)||'[]');
    const u=arr.find(x=>x.email===email && x.pass===pass);
    if(!u) return {ok:false,msg:'Invalid credentials'};
    localStorage.setItem(STORAGE.current, JSON.stringify({name:u.name,email:u.email}));
    return {ok:true};
  },
  logout(){ localStorage.removeItem(STORAGE.current); },
  current(){ return JSON.parse(localStorage.getItem(STORAGE.current)||'null'); }
};
window.AUTH = AUTH;
AUTH.seed();

// ---------- FILM ROLL ----------
function initFilmRoll(){
  const track = $('.film-track');
  if(!track) return;
  const items = Array.from(track.children);
  const mid = (items.length-1)/2;
  items.forEach((it,i)=>{
    const off = i - mid;
    const rotate = off*6;
    const ty = Math.abs(off)*-8;
    const scale = Math.max(.86, 1 - Math.abs(off)*0.06);
    it.style.transform = `translateY(${ty}px) rotate(${rotate}deg) scale(${scale})`;
    it.style.zIndex = `${100 - Math.abs(off)}`;
    it.addEventListener('click', ()=> {
      const page = it.dataset.page;
      if(page) window.location.href = page;
    });
  });
  // controls
  const left = document.querySelector('.slider-control.left');
  const right = document.querySelector('.slider-control.right');
  let idx = 0;
  function scrollTo(i){
    idx = Math.max(0, Math.min(i, items.length-1));
    const width = items[0].offsetWidth + 18;
    const parentCenter = track.parentElement.offsetWidth/2 - width/2;
    track.style.transform = `translateX(${ - (idx * width) + parentCenter }px)`;
  }
  left?.addEventListener('click', ()=> scrollTo(idx-1));
  right?.addEventListener('click', ()=> scrollTo(idx+1));
  setTimeout(()=> scrollTo(0),100);
}

// ---------- VIDEOS PAGE ----------
function initVideos(){
  const upload = $('#videoUpload');
  const videoList = $('#videoList');
  if(!upload || !videoList) return;
  function render(){
    const arr = JSON.parse(localStorage.getItem(STORAGE.videos)||'[]');
    videoList.innerHTML = '';
    arr.forEach((v,i)=>{
      const tile = document.createElement('div'); tile.className='video-tile';
      tile.innerHTML = `<video src="${v.data}" muted loop></video>
        <div class="tile-controls">
          <div class="small">${v.name||('Clip '+(i+1))}</div>
          <div>
            <button class="small preview" data-i="${i}">Preview</button>
            <button class="small download" data-i="${i}">Download</button>
          </div>
        </div>`;
      videoList.appendChild(tile);
      // play on hover
      const vid = tile.querySelector('video');
      tile.addEventListener('mouseenter', ()=> vid.play());
      tile.addEventListener('mouseleave', ()=> vid.pause());
    });
    // wire controls
    $$('.preview').forEach(b=> b.onclick = e=> openVideoPopup(+e.currentTarget.dataset.i));
    $$('.download').forEach(b=> b.onclick = e=> downloadVideo(+e.currentTarget.dataset.i));
  }
  upload.addEventListener('change', e=>{
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      const arr = JSON.parse(localStorage.getItem(STORAGE.videos)||'[]');
      arr.push({name:f.name,type:f.type,data:ev.target.result,when:Date.now()});
      localStorage.setItem(STORAGE.videos, JSON.stringify(arr));
      render();
    };
    reader.readAsDataURL(f);
  });
  render();

  // popup
  const popup = $('#videoPopup'); const popupVid = $('#popupVideo'); const popupClose = $('#videoPopupClose');
  function openVideoPopup(i){
    const arr = JSON.parse(localStorage.getItem(STORAGE.videos)||'[]'); if(!arr[i]) return;
    popupVid.src = arr[i].data; popup.classList.add('open'); popupVid.play();
  }
  popupClose?.addEventListener('click', ()=>{ popupVid.pause(); popup.classList.remove('open'); popupVid.src=''; });
  function downloadVideo(i){
    const arr = JSON.parse(localStorage.getItem(STORAGE.videos)||'[]'); if(!arr[i]) return;
    const a = document.createElement('a'); a.href = arr[i].data; a.download = arr[i].name || 'clip.mp4'; a.click();
  }
}

// ---------- PHOTOBOOTH ----------
function initPhotobooth(){
  const upload = $('#pbUpload'), template = $('#pbTemplate'), previewBtn = $('#pbPreview'), downloadBtn = $('#pbDownload'), canvas = $('#pbCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d'); const W=1000,H=1333; canvas.width=W; canvas.height=H;
  let userImg=null, tpl=null;
  upload?.addEventListener('change', e=>{
    const f = e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload = ev=>{ userImg = new Image(); userImg.onload = draw; userImg.src = ev.target.result; }; r.readAsDataURL(f);
  });
  template?.addEventListener('change', ()=>{ tpl = template.value; draw(); });
  previewBtn?.addEventListener('click', draw);
  downloadBtn?.addEventListener('click', ()=>{
    const url = canvas.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download='photobooth.png'; a.click();
  });
  function draw(){
    if(!ctx) return;
    ctx.fillStyle='#071526'; ctx.fillRect(0,0,W,H);
    if(userImg){
      const r = Math.max(W/userImg.width, H/userImg.height);
      const nw = userImg.width*r, nh = userImg.height*r;
      const dx = (W-nw)/2, dy=(H-nh)/2;
      ctx.drawImage(userImg, dx, dy, nw, nh);
    } else {
      ctx.fillStyle='#142433'; ctx.fillRect(80,80,W-160,H-160);
      ctx.fillStyle='#8ea0b0'; ctx.font='30px Inter'; ctx.fillText('Upload an image to start', 120, H/2);
    }
    if(tpl && tpl!=='none'){
      const im = new Image(); im.onload = ()=> ctx.drawImage(im,0,0,W,H); im.src=tpl;
    }
  }
}

// ---------- PHOTOS DECK ----------
function initPhotosDeck(){
  const deck = $('#deck'); if(!deck) return;
  let photos = JSON.parse(localStorage.getItem(STORAGE.photos)||'[]');
  if(!photos.length){
    photos = [
      {id:'p1', src:'assets/img/sample1.jpg', caption:'Beach day'},
      {id:'p2', src:'assets/img/sample2.jpg', caption:'Sunset'},
      {id:'p3', src:'assets/img/sample3.jpg', caption:'Cafe'},
      {id:'p4', src:'assets/img/sample4.jpg', caption:'Roadtrip'}
    ];
    localStorage.setItem(STORAGE.photos, JSON.stringify(photos));
  }
  deck.innerHTML = '';
  photos.slice().reverse().forEach((p,i)=>{
    const el = document.createElement('div'); el.className='card'; el.style.backgroundImage=`url('${p.src}')`; el.dataset.id=p.id;
    el.style.transform = `translate(-50%,-50%) translateY(${i*6}px) rotate(${(Math.random()-0.5)*6}deg)`;
    const cap = document.createElement('div'); cap.className='caption'; cap.textContent = p.caption; el.appendChild(cap);
    el.draggable = true;
    el.addEventListener('dragstart', e=> e.dataTransfer.setData('text/plain', p.src));
    deck.appendChild(el);
  });

  // holders
  $$('.holder').forEach(h=>{
    h.addEventListener('dragover', e=> e.preventDefault());
    h.addEventListener('drop', e=>{
      e.preventDefault();
      const src = e.dataTransfer.getData('text/plain'); if(!src) return;
      h.innerHTML = `<img src="${src}" style="width:100%;height:auto;border-radius:8px">`;
      // persist
      const holders = JSON.parse(localStorage.getItem(STORAGE.holders)||'{}');
      holders[h.dataset.id || 'h1'] = src; localStorage.setItem(STORAGE.holders, JSON.stringify(holders));
    });
  });
  // restore
  const saved = JSON.parse(localStorage.getItem(STORAGE.holders)||'{}');
  $$('.holder').forEach(h=>{ if(saved[h.dataset.id]) h.innerHTML = `<img src="${saved[h.dataset.id]}" style="width:100%;height:auto;border-radius:8px">`; });

  // swipe remove top card
  let startX=0,drag=false;
  deck.addEventListener('pointerdown', e=>{ startX=e.pageX; drag=true; });
  window.addEventListener('pointerup', e=>{
    if(!drag) return; drag=false; const dx = e.pageX - startX;
    if(Math.abs(dx)>80){ const child = deck.lastElementChild; if(child) child.remove(); }
  });
}

// ---------- GAMES (gift box, confetti, kiss) ----------
function initGames(){
  // gift popup used by multiple game pages
  const giftModal = $('#giftModal'); const giftBox = $('#giftBoxBtn'); const giftResult = $('#giftResult'); const confettiContainer = $('#confetti');
  function openGift(text){
    if(!giftModal) return;
    giftModal.classList.add('open'); giftResult.innerHTML = `<h3>${text}</h3><div class="kiss" id="kissText">😘 I love youuu!</div>`;
  }
  // click animation for gift (explosion => confetti + kiss)
  document.addEventListener('click', (e)=>{
    if(!e.target.matches?.('#giftBtn')) return;
  });
  // here's a simple function to trigger confetti
  function throwConfetti(){
    for(let i=0;i<35;i++){
      const el = document.createElement('div'); el.className='confetti-piece';
      el.style.left = Math.random()*100+'%'; el.style.top = '-10px';
      el.style.width = (6+Math.random()*8)+'px'; el.style.height = (10+Math.random()*12)+'px';
      el.style.background = ['#ff6f91','#ffd6e8','#ffd166','#6be7ff'][Math.floor(Math.random()*4)];
      document.body.appendChild(el);
      // animate
      const dur = 1500 + Math.random()*1000;
      el.animate([{transform:'translateY(0) rotate(0deg)', opacity:1},{transform:`translateY(${700+Math.random()*300}px) rotate(${Math.random()*720}deg)`, opacity:0}], {duration:dur, easing:'cubic-bezier(.2,.8,.2,1)'});
      setTimeout(()=> el.remove(), dur+50);
    }
  }

  // Bind open/close in pages that include .open-gift buttons
  $$('.open-gift').forEach(btn=> btn.addEventListener('click', ()=>{
    // show modal, then when user clicks inner gift, animate
    const modal = $('#giftModal'); modal.classList.add('open');
  }));
  $('#giftModalClose')?.addEventListener('click', ()=> $('#giftModal')?.classList.remove('open'));
  $('#innerGift')?.addEventListener('click', ()=>{
    // show kiss and confetti
    $('#kissText').style.display='block';
    throwConfetti();
  });
}

// ---------- INIT on DOM ready ----------
document.addEventListener('DOMContentLoaded', ()=>{
  AUTH.seed();
  initFilmRoll();
  initVideos();
  initPhotobooth();
  initPhotosDeck();
  initGames();
});
