// Simple client-side auth using localStorage
window.AUTH = {
  seedDemo: function(){
    if(!localStorage.getItem('users')){
      localStorage.setItem('users', JSON.stringify([{name:'My Love', email:'love@example.com', pass:'1234'}]));
    }
  },
  register: function(name,email,pass){
    let users = JSON.parse(localStorage.getItem('users')||'[]');
    if(users.find(u=>u.email===email)) return {ok:false, msg:'Email already registered'};
    users.push({name,email,pass}); 
    localStorage.setItem('users', JSON.stringify(users));
    return {ok:true};
  },
  login: function(email,pass){
    let users = JSON.parse(localStorage.getItem('users')||'[]');
    let user = users.find(u=>u.email===email && u.pass===pass);
    if(user){
      localStorage.setItem('currentUser', JSON.stringify(user));
      return {ok:true};
    }
    return {ok:false, msg:'Email or password incorrect'};
  },
  logout: function(){ localStorage.removeItem('currentUser'); },
  getUser: function(){ return JSON.parse(localStorage.getItem('currentUser')||'null'); }
};
