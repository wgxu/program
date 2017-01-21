/**
 * 血压列表
 *
*/
;(function(w,d){

	//ajax获取数据方法
	function getJson(url,data,callback) {
		var xhq = new XMLHttpRequest();
		xhq.open('post',url,true);
		jsonToPost(data);
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

	var param =  {
		start: '2016-12-06',
		end: '2016-12-14',
		mid: '1d87620e-3070-68d4-a6bf-1bb0c3d1236c'
	};

	function getBloodData(param) {
		getJson('../data/blood.json',param,function(result){
			var result = JSON.parse(result || '[]');
				templFn = doT.template($("templ").innerText);
			$("wrap").innerHTML = templFn(result);
		});
	}

	//默认获取全部数据
	getBloodData(param);


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
			getJson(sendData);
		}else {
			alert('开始时间不能大于结束时间');
			$("startDate").value = '';
		}
	},false);





})(window,document); 
