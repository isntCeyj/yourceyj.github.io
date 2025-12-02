// Simple client-side auth using localStorage
window.AUTH={
  seedDemo:function(){
    if(!localStorage.getItem('users')){
      localStorage.setItem('users',JSON.stringify([{name:'My Love',email:'love@example.com',pass:'1234'}]));
    }
  },
  register:function(name,email,pass){
    let users=JSON.parse(localStorage.getItem('users')||'[]');
    if(users.find(u=>u.email===email)) return {success:false,message:'Email already registered'};
    users.push({name,email,pass}); localStorage.setItem('users',JSON.stringify(users));
    return {success:true};
  },
  login:function(email,pass){
    let users=JSON.parse(localStorage.getItem('users')||'[]');
    let user=users.find(u=>u.email===email && u.pass===pass);
    if(user){localStorage.setItem('currentUser',JSON.stringify(user)); return {success:true};}
    return {success:false,message:'Email or password incorrect'};
  },
  logout:function(){localStorage.removeItem('currentUser');}
};
