
document.getElementById('year').textContent=new Date().getFullYear();
(function(){var s=[].slice.call(document.querySelectorAll('.collection-slides img')),i=0;if(s.length<2||matchMedia('(prefers-reduced-motion: reduce)').matches)return;setInterval(function(){if(document.hidden)return;s[i].classList.remove('is-active');i=(i+1)%s.length;s[i].classList.add('is-active');},4800);})();


(function(){
  var form=document.getElementById('contactForm'),status=document.getElementById('contactStatus'),btn=document.getElementById('contactSubmit');
  if(!form||!window.fetch)return;
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(!form.reportValidity())return;
    btn.disabled=true;btn.firstChild.textContent='SENDING… ';
    status.className='contact-status';status.textContent='';
    fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(new FormData(form)).toString()})
      .then(function(r){if(!r.ok)throw new Error(r.status);form.reset();form.hidden=true;document.getElementById('contactSuccess').hidden=false;document.getElementById('contactSuccess').focus();})
      .catch(function(){status.className='contact-status is-error';status.textContent='Your message could not be sent. Please check your connection and try again.';})
      .then(function(){btn.disabled=false;btn.firstChild.textContent='SEND MESSAGE ';});
  });
  document.getElementById('contactAgain').addEventListener('click',function(){document.getElementById('contactSuccess').hidden=true;form.hidden=false;form.querySelector('input').focus();});
})();
