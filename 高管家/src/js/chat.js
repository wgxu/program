(function(d,w){
	var input = d.getElementById('talkInputId'),
		send = d.getElementsByClassName('send')[0];

	var t = setInterval(function(){
		send.className = input.innerText ? 'send active' : 'send';
	},50);

})(document,window);