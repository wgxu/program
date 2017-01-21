(function(w,d){


	var url = '../data/suger-list.json';

	//ajax获取数据方法
	function getJson(url,data,callback) {
		var xhq = new XMLHttpRequest();
		xhq.open('post',url,true);
		var data = jsonToPost(data);
		xhq.send(data);
		xhq.onreadystatechange = function(){
			var XMLHttpReq = xhq;
		    if (XMLHttpReq.readyState == 4) {
		        if (XMLHttpReq.status == 200) {
		            callback && callback(XMLHttpReq.responseText);
		        }
		    }
		}
	}
	function $(id) {
		return d.getElementById(id);
	}

	function jsonToPost(data) {
		var str = '';
		for(var i in data) {
			str += i + '=' + data[i] + '&';
		}
		return str;
	}

	function getBloodData(param) {
		getJson(url,param,function(result){
			var result = JSON.parse(result || '[]');
				templFn = doT.template($("templ").innerText);
			$("wrap").innerHTML = templFn(result);
		});
	}
	var param = {
		start: '',
		end: '',
		mid: '1d87620e-3070-68d4-a6bf-1bb0c3d1236c'
	};
	getBloodData(param);

	//绑定点击下拉框
	var target = document.getElementsByClassName("select-times")[0],
		mask = document.getElementsByClassName("mask")[0],
		ul = document.getElementsByClassName("title-menu")[0],
		lis = document.getElementsByTagName("li");

	//选择下拉框
	ul.addEventListener('click',function(e){
		if(e.target.nodeName.toLowerCase() == 'li') {
			var index = 0;
			var name = e.target.textContent;
			for(var i = 0; i < lis.length;i++) {
				if(name == lis[i].innerText) {
					index = i;
					if(lis[i].className != 'active') {
						lis[i].className = 'active';
					} 
				}else {
					lis[i].className = '';
				}
			}
			target.innerText = name;
			ul.style.display = 'none';	
			mask.style.display = 'none';
			var start = $("startDate").value,
				end = $("endDate").value;
			
			//0全部时段 1空腹 2早餐后 3午餐前 4午餐后 5晚餐前 6晚餐后 7睡前	8 未知
			var sendData = { 
				start: start,
				end: end,
				period: index,
				mid: '1d87620e-3070-68d4-a6bf-1bb0c3d1236c'
			};
			getJson(url,sendData);
		}
	},false);

	//打开下拉框
	target.addEventListener("click",function(e){
		if(ul.style.display == 'none' || ul.style.display == '') {
			ul.style.display = 'block';
			mask.style.display = 'block';
		}
	},false);

	//选择日期
	d.addEventListener('change',function(){
		var start = $("startDate").value,
			end = $("endDate").value;
		if(!end || start <= end || !start) {
			var sendData = {
				start: start,
				end: end,
				mid: '1d87620e-3070-68d4-a6bf-1bb0c3d1236c'
			};
			getJson(url,sendData);
		}else {
			alert('开始时间不能大于结束时间');
			$("startDate").value = '';
		}
	},false);







})(window,document);