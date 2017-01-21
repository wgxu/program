var curUserId = null;
// var curChatUserId = null;
var conn = null;
var curRoomId = null;
var curChatRoomId = null;
var msgCardDivId = "chat01";
var talkToDivId = "talkTo";
var talkInputId = "talkInputId";
var bothRoster = [];
var toRoster = [];
var maxWidth = 50;
var groupFlagMark = "groupchat";
var chatRoomMark = "chatroom";
var groupQuering = false;
var textSending = false;
var time = 0;
var flashFilename = '';
var audioDom = [];
var picshim;
var audioshim;
var fileshim;
var friendsSub = {};
var PAGELIMIT = 8;
var pageLimitKey = new Date().getTime();
var curUser = GetQueryString("uId");
var pass = GetQueryString("pd");
var from = GetQueryString('from');
var fromUser = GetQueryString('fromId');
var curChatUserId = fromUser;
// console.log(curUser);

// alert(curUser);

var encode = function ( str ) {
	if ( !str || str.length === 0 ) return "";
	var s = '';
	s = str.replace(/&amp;/g, "&");
	s = s.replace(/<(?=[^o][^)])/g, "&lt;");
	s = s.replace(/>/g, "&gt;");
	//s = s.replace(/\'/g, "&#39;");
	s = s.replace(/\"/g, "&quot;");
	s = s.replace(/\n/g, "<br>");
	return s;
};

//处理不支持<audio>标签的浏览器，当前只支持MP3
var playAudioShim = function ( dom, url, t ) {
	var d = $(dom),
		play = d.next(),
		pause = play.next(),
		u = url;

	if ( !d.jPlayer ) {
		return;
	}

	Easemob.im.Helper.getIEVersion < 9 && audioDom.push(d);
	d.jPlayer({
		ready: function () {
			$(this).jPlayer("setMedia", {
				mp3: u
			});
		},
		solution: (Easemob.im.Helper.getIEVersion != 9 ? "html, flash" : "flash"),
		swfPath: "sdk/jplayer",
		supplied: "mp3",
		ended: function () {
			pause.hide();
			play.show();
		}
	});
	play.on('click', function () {
		d.jPlayer('play');
		play.hide();
		pause.show();
	});
	pause.on('click', function () {
		d.jPlayer('pause');
		play.show();
		pause.hide();
	});
};

//处理不支持异步上传的浏览器,使用swfupload作为解决方案
var uploadType = null;
var uploadShim = function ( fileInputId, type ) {
	var pageTitle = document.title;
	if ( typeof SWFUpload === 'undefined' ) {
		return;
	}

	return new SWFUpload({ 
		file_post_name: 'file'
		, flash_url: "static/js/swfupload/swfupload.swf"
		, button_placeholder_id: fileInputId
		, button_width: 24
		, button_height: 24
		, button_cursor: SWFUpload.CURSOR.HAND
		, button_window_mode: SWFUpload.WINDOW_MODE.TRANSPARENT
		, file_size_limit: 10485760
		, file_upload_limit: 0
		, file_queued_handler: function ( file ) {
			if ( this.getStats().files_queued > 1 ) {
				this.cancelUpload();
			}

			var checkType = window[type + 'type'],
                ttype = file.type.slice(1).toLowerCase();

			if ( !checkType[ttype] ) {
				conn.onError({
					type : EASEMOB_IM_UPLOADFILE_ERROR,
					msg : '不支持此文件类型' + file.type
				});
				this.cancelUpload();
			} else if ( 10485760 < file.size ) {
				conn.onError({
					type : EASEMOB_IM_UPLOADFILE_ERROR,
					msg : '文件大小超过限制！请上传大小不超过10M的文件'
				});
				this.cancelUpload();
			} else {
				flashFilename = file.name;

				switch (type) {
					case 'pic':
						sendPic();
						break;
					case 'aud':
						sendAudio();
						break;
					default:
						sendFile();
						break;
				}
			}
		}
		, file_dialog_start_handler: function () {
			if ( Easemob.im.Helper.getIEVersion && Easemob.im.Helper.getIEVersion < 10 ) {
				document.title = pageTitle;
			}
		}
		, upload_error_handler: function ( file, code, msg ) {
			if ( code != SWFUpload.UPLOAD_ERROR.FILE_CANCELLED 
			&& code != SWFUpload.UPLOAD_ERROR.UPLOAD_LIMIT_EXCEEDED 
			&& code != SWFUpload.UPLOAD_ERROR.FILE_VALIDATION_FAILED ) {
				this.uploadOptions.onFileUploadError && this.uploadOptions.onFileUploadError({ type: EASEMOB_IM_UPLOADFILE_ERROR, msg: msg });
			}
		}
		, upload_complete_handler: function () {
			//this.setButtonText('点击上传');
		}
		, upload_success_handler: function ( file, response ) {
			//处理上传成功的回调
			try{
				var res = Easemob.im.Helper.parseUploadResponse(response);
				
				res = $.parseJSON(res);
				res.filename = file.name;
				this.uploadOptions.onFileUploadComplete && this.uploadOptions.onFileUploadComplete(res);
			} catch ( e ) {
				conn.onError({
					type : EASEMOB_IM_UPLOADFILE_ERROR,
					msg : '上传图片发生错误'
				});
			}
		}
	});
}


//提供上传接口
var flashUpload = function ( swfObj, url, options ) {
	swfObj.setUploadURL(url);
	swfObj.uploadOptions = options;
	swfObj.startUpload();
};
var flashPicUpload = function ( url, options ) {
	flashUpload(picshim, url, options);
};
var flashAudioUpload = function ( url, options ) {
	flashUpload(audioshim, url, options);
};
var flashFileUpload = function ( url, options ) {
	flashUpload(fileshim, url, options);
};
var handlePageLimit = (function () {
	if ( Easemob.im.config.multiResources && window.localStorage ) {
		var keyValue = 'empagecount' + pageLimitKey;

		$(window).on('storage', function () {
			localStorage.setItem(keyValue, 1);
		});
		return function () {
			try {
				localStorage.clear();
				localStorage.setItem(keyValue, 1);
			} catch ( e ) {}
		}
	} else {
		return function () {};
	}
}());
var clearPageSign = function () {
	if ( Easemob.im.config.multiResources && window.localStorage ) {
		try {
			localStorage.clear();
		} catch ( e ) {}
	}
};
var getPageCount = function () {
	var sum = 0;

	if ( Easemob.im.config.multiResources && window.localStorage ) {
		for ( var o in localStorage ) {
			if ( localStorage.hasOwnProperty(o) && /^empagecount/.test(o.toString()) ) {
				sum++;		
			}
		}
	}

	return sum;
};

window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
var getLoginInfo = function () {
	return {
		isLogin : false
	};
};
var showLoginUI = function () {
	$('#loginmodal').modal('show');
	$('#username').focus();
};
var hiddenLoginUI = function () {
	$('#loginmodal').modal('hide');
};
var showWaitLoginedUI = function () {
	$('#waitLoginmodal').modal('show');
};
var hiddenWaitLoginedUI = function () {
	$('#waitLoginmodal').modal('hide');
};
// var showChatUI = function () {
// 	$('#content').css({
// 		"display" : "block"
// 	});
// 	var login_userEle = document.getElementById("login_user").children[0];
// 	login_userEle.innerHTML = curUserId;
// 	login_userEle.setAttribute("title", curUserId);
// };
//登录之前不显示web对话框
var hiddenChatUI = function () {
	$('#content').css({
		"display" : "none"
	});
	document.getElementById(talkInputId).value = "";
};
//定义消息编辑文本域的快捷键，enter和ctrl+enter为发送，alt+enter为换行
//控制提交频率
$(function() {
	$("textarea").keydown(function(event) {
		if (event.altKey && event.keyCode == 13) {
			e = $(this).val();
			$(this).val(e + '\n');
		} else if (event.ctrlKey && event.keyCode == 13) {
			//e = $(this).val();
			//$(this).val(e + '<br>');
			event.returnValue = false;
			sendText();
			return false;
		} else if (event.keyCode == 13) {
			event.returnValue = false;
			sendText();
			return false;
		}
	});
	$("#usetoken").on("click", function(){
		if ($("#password").attr("disabled")) {
			$("#password").removeAttr("disabled");
		} else {
			$("#password").attr("disabled", "disabled");
		}
		if ($("#token").attr("disabled")) {
			$("#token").removeAttr("disabled");
		} else {
			$("#token").attr("disabled", "disabled");
		}
	});
});
//easemobwebim-sdk注册回调函数列表
$(document).ready(function() {
	if ( Easemob.im.Helper.getIEVersion && Easemob.im.Helper.getIEVersion < 10 ) {
		$('#em-cr').remove();
	}
	login();
	
	conn = new Easemob.im.Connection({
		multiResources: Easemob.im.config.multiResources,
		https : Easemob.im.config.https,
		url: Easemob.im.config.xmppURL
	});
	//初始化连接
	conn.listen({
		//当连接成功时的回调方法
		onOpened : function() {
			//如果isAutoLogin设置为false，那么必须手动设置上线，否则无法收消息
			conn.setPresence();
			handleOpen(conn);

		},
		//当连接关闭时的回调方法
		onClosed : function() {
			handleClosed();
		},
		//收到文本消息时的回调方法
		onTextMessage : function(message) {
			handleTextMessage(message);
		},
		//收到表情消息时的回调方法
		onEmotionMessage : function(message) {
			handleEmotion(message);
		},
		//收到图片消息时的回调方法
		onPictureMessage : function(message) {
			handlePictureMessage(message);
		},
		//收到音频消息的回调方法
		onAudioMessage : function(message) {
			handleAudioMessage(message);
		},
		//收到位置消息的回调方法
		onLocationMessage : function(message) {
			handleLocationMessage(message);
		},
		//收到文件消息的回调方法
		onFileMessage : function(message) {
			handleFileMessage(message);
		},
		//收到视频消息的回调方法
		onVideoMessage: function(message) {
			handleVideoMessage(message);
		},
		//收到联系人订阅请求的回调方法
		onPresence: function(message) {
			handlePresence(message);
		},
		// //收到联系人信息的回调方法
		// onRoster: function(message) {
		// 	handleRoster(message);
		// },
		//收到群组邀请时的回调方法
		onInviteMessage: function(message) {
			handleInviteMessage(message);
		},
        onOffline: function () {
            setTimeout(logout, 1000);
        },
		//异常时的回调方法
		onError: function(message) {
			handleError(message);
		}
	});
	var loginInfo = getLoginInfo();
	if (loginInfo.isLogin) {
		showWaitLoginedUI();
	} else {
		showLoginUI();
	}
	$('#confirm-block-div-modal').on('hidden.bs.modal', function(e) {
	});
	$('#option-room-div-modal').on('hidden.bs.modal', function(e) {
	});
	$('#notice-block-div').on('hidden.bs.modal', function(e) {
	});
	$('#regist-div-modall').on('hidden.bs.modal', function(e) {
	});
	//在 密码输入框时的回车登录
	$('#password').keypress(function(e) {
		var key = e.which;
		if (key == 13) {
			login();
		}
	});
	$(function() {
		$(window).bind('beforeunload', function() {
			curChatRoomId = null;
			if (conn) {
				conn.close();
				return navigator.userAgent.indexOf("Firefox") > 0 ? ' ' : '';
			}
		});
	});
});

//处理连接时函数,主要是登录成功后对页面元素做处理
var handleOpen = function(conn) {
	//从连接中获取到当前的登录人注册帐号名
	curUserId = conn.context.userId;
	setCurrentContact(fromUser);//页面处理将from联系人作为当前聊天div

	hiddenWaitLoginedUI();
	if ( !Easemob.im.Helper.isCanUploadFileAsync && typeof uploadShim === 'function' ) {
		picshim = uploadShim('sendPicInput', 'pic');
		audioshim = uploadShim('sendAudioInput', 'aud');
		fileshim = uploadShim('sendFileInput', 'file');
	}

	//启动心跳
	if (conn.isOpened()) {
		conn.heartBeat(conn);
	}
};
//连接中断时的处理，主要是对页面进行处理
var handleClosed = function() {
	curUserId = null;
	curChatUserId = null;
	curRoomId = null;
	curChatRoomId = null;
	bothRoster = [];
	toRoster = [];
	hiddenChatUI();
	for(var i=0,l=audioDom.length;i<l;i++) {
		if(audioDom[i].jPlayer) audioDom[i].jPlayer('destroy');
	}
	// clearContactUI("contactlistUL", "contracgrouplistUL","momogrouplistUL", msgCardDivId);
	// showLoginUI();
	groupQuering = false;
	textSending = false;
	alert('该账号已在别处登录！');
};

//异常情况下的处理方法
var handleError = function(e) {
	curChatRoomId = null;

    showLoginUI();
	clearPageSign();
	e && e.upload && $('#fileModal').modal('hide');
	if (curUserId == null) {
		hiddenWaitLoginedUI();
		alert(e.msg + ",请重新登录");
	} else {
		var msg = e.msg;
		if (e.type == EASEMOB_IM_CONNCTION_SERVER_CLOSE_ERROR) {
			if (msg == "" || msg == 'unknown' ) {
				alert("服务器断开连接,可能是因为在别处登录");
			} else {
				alert("服务器断开连接");
			}
		} else if (e.type === EASEMOB_IM_CONNCTION_SERVER_ERROR) {
			if (msg.toLowerCase().indexOf("user removed") != -1) {
				alert("用户已经在管理后台删除");
			}
		} else {
			alert(msg);
		}
	}
	conn.stopHeartBeat();
};
//判断要操作的联系人和当前联系人列表的关系
var contains = function(roster, contact) {
	var i = roster.length;
	while (i--) {
		if (roster[i].name === contact.name) {
			return true;
		}
	}
	return false;
};
Array.prototype.indexOf = function(val) {
	for (var i = 0; i < this.length; i++) {
		if (this[i].name == val.name)
			return i;
	}
	return -1;
};
Array.prototype.remove = function(val) {
	var index = this.indexOf(val);
	if (index > -1) {
		this.splice(index, 1);
	}
};

function GetQueryString(name)
{
	var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
	var result = window.location.search.substr(1).match(reg);
	// if(r!=null)return  unescape(r[2]); return null;
	return result?decodeURIComponent(result[2]):null;
}

//登录系统时的操作方法
var login = function() {
	handlePageLimit();

	setTimeout(function () {

		var total = getPageCount();
		if ( total > PAGELIMIT ) {
			alert('当前最多支持' + PAGELIMIT + '个resource同时登录');
			return;
		}
		// if ($("#usetoken").is(":checked")) {
		// 	var user = $("#username").val();
		// 	var token = $("#token").val();
		// 	if (user == '' || token == '') {
		// 		alert("请输入用户名和令牌");
		// 		return;
		// 	}
		// 	hiddenLoginUI();
		// 	showWaitLoginedUI();
		// 	//根据用户名令牌登录系统
		// 	conn.open({
		// 		apiUrl : Easemob.im.config.apiURL,
		// 		user : user,
		// 		accessToken : token,    
		// 		//连接时提供appkey
		// 		appKey : Easemob.im.config.appkey
		// 	});
		// } else {
		
			// var user = $("#username").val();
			// var user = GetQueryString("username");
			// var pass = $("#password").val();
			// var pass = GetQueryString("pwd");

			// console.log('uwer-'+curUser);
			// console.log('pass-'+pass);
			if (curUser == '' || pass == '') {
				// alert("请输入用户名和密码");
				alert("请输入正确参数！");
				return;
			}

			hiddenLoginUI();
			showWaitLoginedUI();
			//根据用户名密码登录系统
			conn.open({
				apiUrl : Easemob.im.config.apiURL,
				user : curUser,
				pwd : pass,
				//连接时提供appkey
				appKey : Easemob.im.config.appkey
			});         
		// }
		return false;
	}, 50);
};

//设置当前显示的聊天窗口div，如果有联系人则默认选中联系人中的第一个联系人，如没有联系人则当前div为null-nouser
var setCurrentContact = function(defaultUserId) {
	showContactChatDiv(defaultUserId);
	// if (curChatUserId != null) {
	// 	hiddenContactChatDiv(curChatUserId);
	// } else {
		$('#null-nouser').css({
			"display" : "none"
		});
	// }
	curChatUserId = defaultUserId;
};

//选择联系人的处理
var getContactLi = function(chatUserId) {
	return document.getElementById(chatUserId);
};
//构造当前聊天记录的窗口div
var getContactChatDiv = function(chatUserId) {
	return document.getElementById(curUserId + "-" + chatUserId);
};
//如果当前没有某一个联系人的聊天窗口div就新建一个
var createContactChatDiv = function(chatUserId) {
	var msgContentDivId = curUserId + "-" + chatUserId;
	var newContent = document.createElement("div");
	$(newContent).attr({
		"id" : msgContentDivId,
		"class" : "chat01_content",
		"className" : "chat01_content",
		"style" : "display:none"
	});
	return newContent;
};
//显示当前选中联系人的聊天窗口div，并将该联系人在联系人列表中背景色置为蓝色
var showContactChatDiv = function(chatUserId) {
	// console.log('showContactChatDiv');
	var chatUserId = chatUserId;
	var contentDiv = getContactChatDiv(chatUserId);
	if (contentDiv == null) {
		contentDiv = createContactChatDiv(chatUserId);
		document.getElementById(msgCardDivId).appendChild(contentDiv);
	}
	contentDiv.style.display = "block";
	var dispalyTitle = null;//聊天窗口显示当前对话人名称
	dispalyTitle = "正与【" + from + "】聊天中..";
	// console.log(dispalyTitle);
    var title = $('#' + talkToDivId);
	title.html(dispalyTitle).attr('title', dispalyTitle);
};

var emotionFlag = false;
var showEmotionDialog = function() {
	if (emotionFlag) {
		$('#wl_faces_box').css({
			"display" : "block"
		});
		return;
	}
	emotionFlag = true;
	// Easemob.im.Helper.EmotionPicData设置表情的json数组
	var sjson = Easemob.im.EMOTIONS,
		data = sjson.map,
		path = sjson.path;

	for ( var key in data) {
		var emotions = $('<img>').attr({
			"id" : key,
			"src" : path + data[key],
			"style" : "cursor:pointer;"
		}).click(function() {
			selectEmotionImg(this);
		});
		$('<li>').append(emotions).appendTo($('#emotionUL'));
	}
	$('#wl_faces_box').css({
		"display" : "block"
	});
};
//表情选择div的关闭方法
var turnoffFaces_box = function() {
	$("#wl_faces_box").fadeOut("slow");
};
var selectEmotionImg = function(selImg) {
	var txt = document.getElementById(talkInputId);
	txt.innerText = txt.innerText + selImg.id;
	txt.focus();
};

var sendText = function() {
	if (textSending) {
		return ;
	}
	textSending = true;
	var msgInput = document.getElementById(talkInputId);
	var msg = msgInput.innerText;
	if (msg == null || msg.length == 0) {
		textSending = false;
		return;
	}
	var to = fromUser;
	if (to == null) {
		textSending = false;
		return;
	}
	var options = {
		to : to,
		msg : msg,
		type : "chat"
	};
	// var curUserId = fromUser;
	console.log(options);
	//easemobwebim-sdk发送文本消息的方法 to为发送给谁，meg为文本消息对象
	conn.sendTextMessage(options);
	//当前登录人发送的信息在聊天窗口中原样显示
	var msgtext = Easemob.im.Utils.parseLink(Easemob.im.Utils.parseEmotions(encode(msg)));

	appendMsg(curUserId, to, msgtext);
	// console.log('-12141');
	turnoffFaces_box();
	msgInput.value = "";
	msgInput.focus();
	msgInput.innerText = ''; //清空输入框
	setTimeout(function() {
		textSending = false;
	}, 1000);
};
var pictype = {
	"jpg" : true,
	"gif" : true,
	"png" : true,
	"bmp" : true
};
var send = function () {

	var fI = $('#fileInput');
	fI.val('').attr('data-type', this.getAttribute('type')).click();
};
$('#sendPicBtn, #sendAudioBtn, #sendFileBtn').on('click', send);
$('#fileInput').on('change', function() {

	switch ( this.getAttribute('data-type') ) {
		case 'img':
			sendPic();
			break;
		case 'audio':
			sendAudio();
			break;
		default:
			sendFile();
			break;
	};
});

//发送图片消息时调用方法
var sendPic = function() {

	var to = fromUser;
	if (to == null) {
		return;
	}

	// Easemob.im.Helper.getFileUrl为easemobwebim-sdk获取发送文件对象的方法，fileInputId为 input 标签的id值
	var fileObj = Easemob.im.Helper.getFileUrl('fileInput');
	if (Easemob.im.Helper.isCanUploadFileAsync && (fileObj.url == null || fileObj.url == '')) {
		alert("请先选择图片");
		return;
	}
	var filetype = fileObj.filetype || '';
	var filename = fileObj.filename;
	if (!Easemob.im.Helper.isCanUploadFileAsync || filetype.toLowerCase() in pictype) {
		var opt = {
			type : 'chat',
			fileInputId : 'fileInput',
			filename : flashFilename || filename,
			to : to,
			apiUrl: Easemob.im.config.apiURL,
			onFileUploadError : function(error) {
				var messageContent = (error.msg || '') + ",发送图片文件失败:" + (filename || flashFilename);
				appendMsg(curUserId, to, messageContent);
			},
			onFileUploadComplete : function(data) {

				var file = document.getElementById('fileInput');
				if ( Easemob.im.Helper.isCanUploadFileAsync && file && file.files) {
					var objUrl = getObjectURL(file.files[0]);
					if (objUrl) {
						var img = document.createElement("img");
						img.src = objUrl;
						// img.width = maxWidth;
					}
				} else {
					filename = data.filename || '';
					var img = document.createElement("img");
					img.src = data.uri + '/' + data.entities[0].uuid;
					// img.width = maxWidth;
				}
				appendMsg(curUserId, to, {
					data : [ {
						type : 'pic',
						filename : filename,
						data : img
					} ]
				});
			},
			flashUpload: flashPicUpload
		};
		if (curChatUserId.indexOf(groupFlagMark) >= 0) {
			opt.type = groupFlagMark;
			opt.to = curRoomId;
		} else if (curChatUserId.indexOf(chatRoomMark) >= 0) {
			opt.type = groupFlagMark;
			opt.roomType = chatRoomMark;
			opt.to = curChatRoomId;
		}
		conn.sendPicture(opt);
		return;
	}
	alert("不支持此图片类型" + filetype);
};
var audtype = {
	"mp3" : true,
	"wma" : true,
	"wav" : true,
	"amr" : true,
	"avi" : true
};
//发送音频消息时调用的方法
var sendAudio = function() {
	var to = fromUser;
	if (to == null) {
		return;
	}
	//利用easemobwebim-sdk提供的方法来构造一个file对象
	var fileObj = Easemob.im.Helper.getFileUrl('fileInput');
	if (Easemob.im.Helper.isCanUploadFileAsync && (fileObj.url == null || fileObj.url == '')) {
		alert("请先选择音频");
		return;
	}
	var filetype = fileObj.filetype || '';
	var filename = fileObj.filename;
	if (!Easemob.im.Helper.isCanUploadFileAsync || filetype.toLowerCase() in audtype) {
		var opt = {
			type : "chat",
			fileInputId : 'fileInput',
			filename : flashFilename || filename,
			to : to,//发给谁
			apiUrl: Easemob.im.config.apiURL,
			onFileUploadError : function(error) {
				var messageContent = (error.msg || '') + ",发送音频失败:" + (filename || flashFilename);
				appendMsg(curUserId, to, messageContent);
			},
			onFileUploadComplete : function(data) {
				var messageContent = "发送音频" + data.filename;

				var file = document.getElementById('fileInput');
				var aud = document.createElement('audio');
				aud.controls = true;

				if (Easemob.im.Helper.isCanUploadFileAsync && file && file.files) {
					var objUrl = getObjectURL(file.files[0]);
					if (objUrl) {
						aud.setAttribute('src', objUrl);
					}
				} else {
					aud.setAttribute('src', data.uri + '/' + data.entities[0].uuid);
				}

				appendMsg(curUserId, to, {
					data : [ {
						type : 'audio',
						filename : filename,
						data : aud,
						audioShim: !window.Audio
					} ]
				});
			},
			flashUpload: flashAudioUpload
		};
		//构造完opt对象后调用easemobwebim-sdk中发送音频的方法
		if (curChatUserId.indexOf(groupFlagMark) >= 0) {
			opt.type = groupFlagMark;
			opt.to = curRoomId;
		} else if (curChatUserId.indexOf(chatRoomMark) >= 0) {
			
			opt.type = groupFlagMark;
			opt.roomType = chatRoomMark;
			opt.to = curChatRoomId;
		}
		conn.sendAudio(opt);
		return;
	}
	alert("不支持此音频类型" + filetype);
};
var filetype = {
	"mp3" : true,
	"wma" : true,
	"wav" : true,
	"amr" : true,
	"avi" : true,
	"jpg" : true,
	"jpeg" : true,
	"gif" : true,
	"png" : true,
	"bmp" : true,
	"zip" : true,
	"rar" : true,
	"doc" : true,
	"docx" : true,
	"txt" : true,
	"pdf" : true
};
//发送文件消息时调用的方法
var sendFile = function() {
	var to = fromUser;
	if (to == null) {
		return;
	}
	//利用easemobwebim-sdk提供的方法来构造一个file对象
	var fileObj = Easemob.im.Helper.getFileUrl('fileInput');
	if (Easemob.im.Helper.isCanUploadFileAsync && (fileObj.url == null || fileObj.url == '')) {
		alert("请选择发送音频");
		return;
	}
	var fileType = fileObj.filetype || '';
	var filename = fileObj.filename;
	if (!Easemob.im.Helper.isCanUploadFileAsync || fileType.toLowerCase() in filetype) {
		var opt = {
			type : "chat",
			fileInputId : 'fileInput',
			filename : filename || flashFilename,
			to : to,//发给谁
			apiUrl: Easemob.im.config.apiURL,
			onFileUploadError : function(error) {
				var messageContent = (error.msg || '') + ",发送文件失败:" + (filename || flashFilename);
				appendMsg(curUserId, to, messageContent);
			},
			onFileUploadComplete : function(data) {
				var messageContent = "发送文件" + (filename || data.filename);
				appendMsg(curUserId, to, messageContent);
			},
			flashUpload: flashFileUpload
		};
		//构造完opt对象后调用easemobwebim-sdk中发送音频的方法
		if (curChatUserId.indexOf(groupFlagMark) >= 0) {
			opt.type = groupFlagMark;
			opt.to = curRoomId;
		} else if (curChatUserId.indexOf(chatRoomMark) >= 0) {
			opt.type = groupFlagMark;
			opt.roomType = chatRoomMark;
			opt.to = curChatRoomId;
		}
		conn.sendFile(opt);
		return;
	}
	alert("不支持此文件类型" + fileType);
};
//easemobwebim-sdk收到文本消息的回调方法的实现
var handleTextMessage = function(message) {
	// console.log(message);
	var from = message.from;//消息的发送者
	var mestype = message.type;//消息发送的类型是群组消息还是个人消息
	var messageContent = message.data;//文本消息体

	if (from == fromUser && mestype =='chat'){
		appendMsg(from, from, messageContent);
	}
};
//easemobwebim-sdk收到表情消息的回调方法的实现，message为表情符号和文本的消息对象，文本和表情符号sdk中做了
//统一的处理，不需要用户自己区别字符是文本还是表情符号。
var handleEmotion = function(message) {
	var from = message.from;
	var room = message.to;
	var mestype = message.type;//消息发送的类型是群组消息还是个人消息
	if (mestype == groupFlagMark || mestype == chatRoomMark) {
		appendMsg(message.from, mestype + message.to, message);
	} else {
		appendMsg(from, from, message);
	}
};
//easemobwebim-sdk收到图片消息的回调方法的实现
var handlePictureMessage = function(message) {
	var filename = message.filename;//文件名称，带文件扩展名
	var from = message.from;//文件的发送者
	var mestype = message.type;//消息发送的类型是群组消息还是个人消息
	var contactDivId = from;
	if (mestype == groupFlagMark || mestype == chatRoomMark) {
		contactDivId = mestype + message.to;
	}
	var options = message;

	var img = document.createElement("img");
	img.src = message.url;
	appendMsg(from, contactDivId, {
		data : [ {
			type : 'pic',
			filename : filename || '',
			data : img
		} ]
	});
};

//easemobwebim-sdk收到音频消息回调方法的实现
var handleAudioMessage = function(message) {
	var filename = message.filename;
	var filetype = message.filetype;
	var from = message.from;
	var mestype = message.type;//消息发送的类型是群组消息还是个人消息
	var contactDivId = from;
	if (mestype == groupFlagMark || mestype == chatRoomMark) {
		contactDivId = mestype + message.to;
	}

	var audio = document.createElement("audio");
	audio.controls = "controls";
	audio.innerHTML = "当前浏览器不支持播放此音频:" + filename;
	//audio.src = message.url;

	appendMsg(from, contactDivId, {
		data : [ {
			type : 'audio',
			filename : filename || '',
			data : audio,
			audioShim: !window.Audio
		} ]
	});/**/

	var options = message;
	options.onFileDownloadComplete = function(response, xhr) {
		var objectURL = Easemob.im.Helper.parseDownloadResponse.call(this, response);
		if (Easemob.im.Helper.getIEVersion != 9 && window.Audio) {
			audio.onload = function() {
				audio.onload = null;
				window.URL && window.URL.revokeObjectURL && window.URL.revokeObjectURL(audio.src);
			};
			audio.onerror = function() {
				audio.onerror = null;
			};
			audio.src = objectURL;
			return;
		}
	};
	options.onFileDownloadError = function(e) {
		appendMsg(from, contactDivId, e.msg + ",下载音频" + filename + "失败");
	};
	options.headers = {
		"Accept" : "audio/mp3"
	};
	Easemob.im.Helper.download(options);
};
//处理收到文件消息
var handleFileMessage = function(message) {
	var filename = message.filename;
	var filetype = message.filetype;
	var from = message.from;
	var mestype = message.type;//消息发送的类型是群组消息还是个人消息
	var contactDivId = from;
	if (mestype == groupFlagMark || mestype == chatRoomMark) {
		contactDivId = mestype + message.to;
	}
	var options = message;
	options.onFileDownloadComplete = function(response, xhr) {
		var spans = "收到文件消息:" + filename;
		appendMsg(from, contactDivId, spans);
		return;
	};
	options.onFileDownloadError = function(e) {
		appendMsg(from, contactDivId, e.msg + ",下载文件" + filename + "失败");
	};
	Easemob.im.Helper.download(options);
};
//收到视频消息
var handleVideoMessage = function(message) {
	var filename = message.filename;
	var filetype = message.filetype;
	var from = message.from;
	var mestype = message.type;//消息发送的类型是群组消息还是个人消息
	var contactDivId = from;
	if (mestype == groupFlagMark || mestype == chatRoomMark) {
		contactDivId = mestype + message.to;
	}
	var options = message;
	
	var video = document.createElement("video");
	video.controls = "controls";
	video.src = message.url;
	video.innerHTML = "收到视频消息:" + options.filename + ', 当前浏览器不支持video，无法播放';

	appendMsg(from, contactDivId, {
		data : [ {
			type : 'video',
			filename : filename || '',
			data : video
		} ]
	});
};
var handleLocationMessage = function(message) {
	var from = message.from;
	var to = message.to;
	var mestype = message.type;
	var content = message.addr;
	if (mestype == groupFlagMark || mestype == chatRoomMark) {
		appendMsg(from, mestype + to, content);
	} else {
		appendMsg(from, from, content);
	}
};

//显示聊天记录的统一处理方法
var appendMsg = function(who, contact, message, onlyPrompt) {

	var contactDivId = contact;
	// 消息体 {isemotion:true;body:[{type:txt,msg:ssss}{type:emotion,msg:imgdata}]}
	var localMsg = null;
	if (typeof message == 'string') {
		localMsg = Easemob.im.Helper.parseTextMessage(message);
		localMsg = localMsg.body;
	} else {
		localMsg = message.data;
	}
	var headstr = onlyPrompt ? ["<p1>" + message + "</p1>"] : ["<p2>" + getLoacalTimeString() + "<b></b><br/></p2>" ];
	var header = $(headstr.join(''))
	
	var timeDiv = document.createElement("div");
	var lineDiv = document.createElement("div");

	// lineDiv.attr("class","chat-message");
	// console.log(lineDiv);
	for (var i = 0; i < header.length; i++) {
		var ele = header[i];
		timeDiv.appendChild(ele);
	}
	timeDiv.style.textAlign = "center";

	var messageContent = localMsg,
		flg = onlyPrompt ? 0 : messageContent.length;

	for (var i = 0; i < flg; i++) {
		var msg = messageContent[i];
		var type = msg.type;
		var data = msg.data;
		
		if (type == "emotion") {
			var ele = $("<p><img src='" + data + "'/></p>");
			ele.attr("class", "chat-content-p3");
            lineDiv.appendChild(ele.get(0));
		} else if (type == "pic" || type == 'audio' || type == 'video') {
			var fileele = $("<p>" + msg.filename + "</p>");
			// console.log(fileele.get(0));
			fileele.attr("class", "chat-content-p3");
            // lineDiv.appendChild(fileele.get(0));
			data.nodeType && lineDiv.appendChild(data);
            $(data).on('load', function(){
                var last = $(msgContentDiv).children().last().get(0);
                last && last.scrollIntoView && last.scrollIntoView();
            });
			if(type == 'audio' && msg.audioShim) {
				var d = $(lineDiv),
					t = new Date().getTime();
				d.append($('<div class="'+t+'"></div>\
					<button class="play'+t+'">播放</button><button style="display:none" class="play'+t+'">暂停</button>'));
			}
		} else {
			var ele = $("<p>" + data + "</p>");
			ele.attr("class", "chat-content-p3");
            lineDiv.appendChild(ele.get(0));
		}
	}
	// if (curChatUserId == null) {
		onlyPrompt || setCurrentContact(contact);
		if (time < 1) {
			//$('#accordion3').click();
			time++;
		}
	// }
	if (curChatUserId && curChatUserId.indexOf(contact) < 0) {
		var contactLi = curChatUserId;
		if (contactLi == null) {
			return;
		}
		contactLi.style.backgroundColor = "green";
		var badgespan = $(contactLi).children(".badge");
		if (badgespan && badgespan.length > 0) {
			var count = badgespan.text();
			var myNum = new Number(count);
			myNum++;
			badgespan.text(myNum);
		} else {
			$(contactLi).append('<span class="badge">1</span>');
		}
	}
	var msgContentDiv = getContactChatDiv(contactDivId);
	if ( onlyPrompt ) {
		lineDiv.style.textAlign = "center";
	} else if (curUserId == who) {
		lineDiv.className = 'doctor clearfix'; //医生解答(自己)
		lineDiv.style.textAlign = "right";
		lineDiv.style.marginRight = "15px";
	} else {
		lineDiv.className = 'patid clearfix'; //病人咨询(别人)
		lineDiv.style.textAlign = "left";
		lineDiv.style.marginLeft = "15px";

	}
	var create = false;
	if (msgContentDiv == null) {
		msgContentDiv = createContactChatDiv(contactDivId);
		create = true;
	}
	msgContentDiv.appendChild(lineDiv);
	if (create) {
		// console.log(msgContentDiv);
		document.getElementById(msgCardDivId).appendChild(msgContentDiv);
	}
	if(type == 'audio' && msg.audioShim) {
		setTimeout(function(){
			playAudioShim(d.find('.'+t), data.currentSrc, t);
		}, 0);
	}
    
	msgContentDiv.scrollTop = msgContentDiv.scrollHeight;
	return lineDiv;
};

//清除聊天记录
var clearCurrentChat = function clearCurrentChat() {
	var currentDiv = getContactChatDiv(curChatUserId)
			|| createContactChatDiv(curChatUserId);
	currentDiv.innerHTML = "";
};

var getObjectURL = function getObjectURL(file) {
	var url = null;
	if (window.createObjectURL != undefined) { // basic
		url = window.createObjectURL(file);
	} else if (window.URL != undefined) { // mozilla(firefox)
		url = window.URL.createObjectURL(file);
	} else if (window.webkitURL != undefined) { // webkit or chrome
		url = window.webkitURL.createObjectURL(file);
	}
	return url;
};
var getLoacalTimeString = function getLoacalTimeString() {
	var date = new Date();
	var time = date.getHours() + ":" + date.getMinutes() + ":"
			+ date.getSeconds();
	return time;
}


Easemob.im.EMOTIONS = {
    path: '../static/img/faces/'
    , map: {
        '[):]': 'ee_1.png',
        '[:D]': 'ee_2.png',
        '[;)]': 'ee_3.png',
        '[:-o]': 'ee_4.png',
        '[:p]': 'ee_5.png',
        '[(H)]': 'ee_6.png',
        '[:@]': 'ee_7.png',
        '[:s]': 'ee_8.png',
        '[:$]': 'ee_9.png',
        '[:(]': 'ee_10.png',
        '[:\'(]': 'ee_11.png',
        '[:|]': 'ee_12.png',
        '[(a)]': 'ee_13.png',
        '[8o|]': 'ee_14.png',
        '[8-|]': 'ee_15.png',
        '[+o(]': 'ee_16.png',
        '[<o)]': 'ee_17.png',
        '[|-)]': 'ee_18.png',
        '[*-)]': 'ee_19.png',
        '[:-#]': 'ee_20.png',
        '[:-*]': 'ee_21.png',
        '[^o)]': 'ee_22.png',
        '[8-)]': 'ee_23.png',
        '[(|)]': 'ee_24.png',
        '[(u)]': 'ee_25.png',
        '[(S)]': 'ee_26.png',
        '[(*)]': 'ee_27.png',
        '[(#)]': 'ee_28.png',
        '[(R)]': 'ee_29.png',
        '[({)]': 'ee_30.png',
        '[(})]': 'ee_31.png',
        '[(k)]': 'ee_32.png',
        '[(F)]': 'ee_33.png',
        '[(W)]': 'ee_34.png',
        '[(D)]': 'ee_35.png'
    }
};
