// miniprogram/pages/kecheng/kechengplay/kechengplay.js

import {getLastElem} from "../../../utils/util";
import {asyncCheckLessonPrivilege} from "../../../utils/markshawn/lesson";

const app = getApp();
const db = wx.cloud.database();
const ac = wx.createInnerAudioContext(); // 音频

const FUNC_SEND_NOTIFICATION = "sendNotification"

Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		shiting: 0,
		mid: "",
		kid: "",
		formats: {},
		readOnly: false,
		placeholder: "提问越聚焦，得到的回复越清晰。可以插入图片哦。",
		editorHeight: 300,
		keyboardHeight: 0,
		isIOS: false,
		safeHeight: 0,
		toolBarHeight: 50,
		ask: false,
		asks1: [],
		asks2: [],
		reply: false,
		reply2: false,
		cantsubmit: true,
		currenttime: "",
		com1_id: "",
		ask1_id: "",
		user_recv_id: "",
		user_recv_name: "",
		like_color: "red",
		kecheng: {},
		comments1: [],
		comments2: [],
		current_comment: "",
		activeTab: 0,
		pinglun: false,
		logged: false,
		user: {},
		userList: [],
		video_url: "",
		// watchType: 12
	},
	
	onTabClick(e) {
		// console.log(this.data.watchType);
		const index = e.detail.index;
		this.setData({
			activeTab: index,
		});
		/*
		if (index == 1 && this.data.watchType == 12) {
		  wx.showToast({
			title: app.globalData.vip_only,
			icon: "none",
		  });
		} else {
		  this.setData({
			activeTab: index,
		  });
		}
		*/
	},
	
	onChange(e) {
		const index = e.detail.index;
		this.setData({
			activeTab: index,
		});
	},
	
	loadActivities: function (aid_list) {
		wx.showLoading({
			title: "加载中",
		});
		db.collection("activity")
		.where({
			_id: db.command.in(aid_list)
		})
		.get({
			success: (res) => {
				this.setData({
					activityList: res.data,
				});
				console.log(res.data);
				wx.hideLoading();
			},
			fail: (res) => {
				console.log(res);
			},
		});
	},
	
	loadkecheng: function (kid) {
		wx.showLoading({
			title: "加载中",
		});
		db.collection("kechengs_safe")
		.doc(kid)
		.get({
			success: (res) => {
				/** 使用云函数获取课程地址 */
				wx.cloud.callFunction({
					name: "getVideoAddress",
					data: {
						kid: kid // 我应该有权限获取这个kid的视频地址
					},
					success: (res_url) => {
						console.log("野猪上天了！")
						console.log(res_url)
						
						this.setData({
							kecheng: res.data,
							"kecheng.kecheng_dizhi": res_url.result.url,
							"kecheng.lianxiti_url": res_url.result.lianxiti_url
						});
						console.log(this.data.kecheng);
						wx.setNavigationBarTitle({
							title: res.data.kecheng_name,
						});
						
						this.loadActivities(res.data.aid_list);
						
						wx.hideLoading();
						console.log(this.data.kecheng);
					},
					fail: (err) => {
						console.error("野猪上天失败！", err);
					},
				});
			},
			fail: (res) => {
				console.log(res);
			},
		});
		
	},
	
	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		console.log(app.globalData.openid);
		
		// 为屎山再添一坨屎
		// 两坨
		// 三坨
		// 调用云函数
		if (!app.globalData.openid) {
			wx.cloud.callFunction({
				name: "login",
				data: {},
				success: (res) => {
					console.log("[云函数] [login]  ", res.result);
					app.globalData.openid = res.result.openid;
					app.globalData.serverConfig = res.result.config;
					this.getopeninfo();
					
					db.collection("users")
					.where({
						_openid: app.globalData.openid,
					})
					.get({
						success: (res) => {
							if (res.data.length == 0) {
								this.setData({
									logged: false,
								});
							} else {
								this.setData({
									logged: true,
									userList: res.data,
								});
								this.setData({
									mid: options.mid,
									kid: options.kid,
									is_audio: options.is_audio,
									video_url: options.video_url,
									// watchType: Number(options.type),
								});
								console.log(this.data.logged);
								// 这里重新鉴权
								if (this.data.logged == false) {
									app.getUserProfile();
								}
								// javascript我日你奶奶个孙子
								if (typeof options.video_url == "undefined" || options.video_url == null || options.video_url == "") {
									
									wx.cloud.callFunction({
										name: 'getVideoAddress',
										data: {
											kid: this.data.kid,
										},
										success: (res_url) => {
											console.log("我进来了")
											if (res_url.result) {
												let video_url = res_url.result.url;
												this.setData({
													video_url: video_url,
												});
												console.log("野猪拉屎了！");
												console.log({video_url})
											} else {
												wx.showToast({
													title: "你没有权限查看该课程！",
													icon: "none",
												});
											}
										},
										fail: (err) => {
											console.log("我吃屎了")
											wx.showToast({
												title: "获取视频地址失败！请尝试刷新！",
												icon: "none",
											});
											console.error("野猪拉屎失败！", err);
										},
									});
								}
								
								if (options.showAsk) {
									this.setData({
										activeTab: 1,
									});
									this.getopeninfoWithReplyAction();
								} else {
									this.getopeninfo();
								}
								
								let tabs = [
									{
										title: "索引",
									},
									{
										title: "讨论",
									},
									{
										title: (options.is_audio == 'true') ? "词汇发音" : "练习题", // 如果is_audio是ture，就改title
									},
									{
										title: "相关推荐",
									},
								];
								
								this.setData({
									tabs: tabs,
									is_audio: (options.is_audio == 'true')
								})
								
								this.loadkecheng(options.kid);
								this.loadComment(options.kid);
								this.loadAsks(options.kid);
								
								if (options.type > 10) {
									if (options.type == 12) {
										this.loadshiting(1);
									} else {
										this.loadshiting(0);
									}
								} else {
									return;
								}
								
								const {
									platform,
									safeArea,
									model,
									screenHeight
								} = wx.getSystemInfoSync();
								
								let safeHeight;
								if (safeArea) {
									safeHeight = screenHeight - safeArea.bottom;
								} else {
									safeHeight = 32;
								}
								this._safeHeight = safeHeight;
								let isIOS = platform === "ios";
								
								wx.setInnerAudioOption({
									obeyMuteSwitch: false
								})
								
								if (isIOS) {
									wx.setInnerAudioOption({
										mixWithOther: true,
										obeyMuteSwitch: false
									})
									console.log(platform);
									console.log('set obeyMuteSwitch to false')
								} else {
									console.log(platform);
								}
								
								this.setData({
									isIOS,
									safeHeight,
									toolBarHeight: isIOS ? safeHeight + 50 : 50,
								});
								const that = this;
								this.updatePosition(0);
								let keyboardHeight = 0;
								wx.onKeyboardHeightChange((res) => {
									if (res.height === keyboardHeight) {
										return;
									}
									const duration = res.height > 0 ? res.duration * 1000 : 0;
									keyboardHeight = res.height;
									setTimeout(() => {
										wx.pageScrollTo({
											scrollTop: 0,
											success() {
												that.updatePosition(keyboardHeight);
												that.editorCtx.scrollIntoView();
											},
										});
									}, duration);
								});
							}
						},
					});
				},
				fail: (err) => {
					console.error("[云函数] [login] 调用失败", err);
				},
			});
		} else {
			db.collection("users")
			.where({
				_openid: app.globalData.openid,
			})
			.get({
				success: (res) => {
					if (res.data.length == 0) {
						this.setData({
							logged: false,
						});
					} else {
						this.setData({
							logged: true,
							userList: res.data,
						});
						this.setData({
							mid: options.mid,
							kid: options.kid,
							is_audio: options.is_audio,
							video_url: options.video_url,
							// watchType: Number(options.type),
						});
						console.log(this.data.logged);
						// 这里重新鉴权
						if (this.data.logged == false) {
							app.getUserProfile();
						}
						// javascript我日你奶奶个孙子
						if (typeof options.video_url == "undefined" || options.video_url == null || options.video_url == "") {
							
							wx.cloud.callFunction({
								name: 'getVideoAddress',
								data: {
									kid: this.data.kid,
								},
								success: (res_url) => {
									console.log("我进来了")
									if (res_url.result) {
										let video_url = res_url.result.url;
										this.setData({
											video_url: video_url,
										});
										console.log("野猪拉屎了！");
									} else {
										wx.showToast({
											title: "你没有权限查看该课程！",
											icon: "none",
										});
									}
								},
								fail: (err) => {
									console.log("我吃屎了")
									wx.showToast({
										title: "获取视频地址失败！请尝试刷新！",
										icon: "none",
									});
									console.error("野猪拉屎失败！", err);
								},
							});
						}
						
						if (options.showAsk) {
							this.setData({
								activeTab: 1,
							});
							this.getopeninfoWithReplyAction();
						} else {
							this.getopeninfo();
						}
						
						let tabs = [
							{
								title: "索引",
							},
							{
								title: "讨论",
							},
							{
								title: (options.is_audio == 'true') ? "词汇发音" : "练习题", // 如果is_audio是ture，就改title
							},
							{
								title: "相关推荐",
							},
						];
						
						this.setData({
							tabs: tabs,
							is_audio: (options.is_audio == 'true')
						})
						
						this.loadkecheng(options.kid);
						this.loadComment(options.kid);
						this.loadAsks(options.kid);
						
						if (options.type > 10) {
							if (options.type == 12) {
								this.loadshiting(1);
							} else {
								this.loadshiting(0);
							}
						} else {
							return;
						}
						
						const {
							platform,
							safeArea,
							model,
							screenHeight
						} = wx.getSystemInfoSync();
						
						let safeHeight;
						if (safeArea) {
							safeHeight = screenHeight - safeArea.bottom;
						} else {
							safeHeight = 32;
						}
						this._safeHeight = safeHeight;
						let isIOS = platform === "ios";
						
						wx.setInnerAudioOption({
							obeyMuteSwitch: false
						})
						
						if (isIOS) {
							wx.setInnerAudioOption({
								mixWithOther: true,
								obeyMuteSwitch: false
							})
							console.log(platform);
							console.log('set obeyMuteSwitch to false')
						} else {
							console.log(platform);
						}
						
						this.setData({
							isIOS,
							safeHeight,
							toolBarHeight: isIOS ? safeHeight + 50 : 50,
						});
						const that = this;
						this.updatePosition(0);
						let keyboardHeight = 0;
						wx.onKeyboardHeightChange((res) => {
							if (res.height === keyboardHeight) {
								return;
							}
							const duration = res.height > 0 ? res.duration * 1000 : 0;
							keyboardHeight = res.height;
							setTimeout(() => {
								wx.pageScrollTo({
									scrollTop: 0,
									success() {
										that.updatePosition(keyboardHeight);
										that.editorCtx.scrollIntoView();
									},
								});
							}, duration);
						});
					}
				},
			});
		}
		
	},
	
	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () {
		this.videoContext = wx.createVideoContext("myVideo");
	},
	
	onActivityDetail(e) {
		let id = e.currentTarget.dataset.id;
		let type = e.currentTarget.dataset.type; // real/activity，传入real以后detail页面就不调用searchActivity云函数了
		console.log(e);
		console.log(id);
		wx.navigateTo({
			url: "../../activity/detail/detail?activity_id=" + id + "&type=" + type,
		});
	},
	
	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () {
		// 获取当前小程序的页面栈
		let pages = getCurrentPages();
		// 数组中索引最大的页面--当前页面
		let currentPage = pages[pages.length - 1];
		// 打印出当前页面中的 options
		//this.onLoad(currentPage.options);  //todo：风怒，是田，但业
	},
	
	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide: function () {
	},
	
	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload: function () {
	},
	
	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh: function () {
	},
	
	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom: function () {
	},
	
	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage: function () {
		const pages = getCurrentPages();
		const currentPage = pages[pages.length - 1];
		let url = `/${currentPage.route}`;
		
		url = url + "?kid=" + this.data.kid +
			"&mid=" + this.data.mid +
			"&is_audio=" + this.data.is_audio +
			"&video_url=";
		console.log(url);
		return {
			path: url
		}
	},
	
	// getUserInfo只能通过用户点击触发，所以要移出来
	onClickBuy(e) {
		let type = e.currentTarget.dataset.type;
		let self = this;
		
		if (app.globalData.user) {
			// 实物商品需要写地址
			if (type == 'real') {
				wx.chooseAddress({
					success(res) {
						self.setData({
							address: res
						})
						self.onBuy(e)
					},
					
					fail(err) {
						console.log(err);
					}
				})
			} else {
				this.onBuy(e);
			}
		} else {
			app.getUserProfile();
		}
	},
	
	onBuy(e) {
		console.log(e);
		if (app.globalData.user) {
			
			wx.showLoading({
				title: "支付请求中",
			});
			
			let aid = e.currentTarget.dataset.id;
			let savedCity = wx.getStorageSync("city");
			let self = this;
			
			// 默认值，有收货地址则更新
			let arg_data = {
				aid: aid,
				body: e.currentTarget.dataset.name,
				sid: "sub_class1",
				amount: 1,
				nickName: "小学生",
				phone: 13810599490,
				city: savedCity ? savedCity.name : "无",
				createTime: new Date().getTime(),
				//openid: app.globalData.openid,
				price: e.target.dataset.price,
			}
			
			console.log(self);
			let addr = self.data.address;
			console.log(addr);
			
			// 替换真实信息，传入pay2，存入数据库orders_activity
			if (addr) {
				arg_data.nickName = addr.userName;
				arg_data.city = `${addr.provinceName} ${addr.cityName} ${addr.countyName} ${addr.streetName} ${addr.detailInfo} ${addr.postalCode} `;
				arg_data.phone = `${addr.telNumber}`;
			} else {
				// noop
			}
			
			console.log(arg_data);
			
			wx.cloud.callFunction({
				name: "pay2",
				data: arg_data,
				success: (res) => {
					wx.hideLoading();
					console.log(res);
					const payment = res.result.payment;
					console.log(payment);
					wx.requestPayment({
						...payment,
						success(res) {
							console.log("pay success", res);
							wx.showLoading({
								title: "支付成功，正在跳转",
							});
							setTimeout(() => {
								wx.hideLoading();
							}, 3000);
							wx.navigateBack();
						},
						fail(err) {
							console.error("pay fail", err);
						},
					});
				},
				fail: console.error,
			});
		} else {
			app.getUserProfile();
		}
	},
	
	// 播放音频
	play_audio: function (e) {
		ac.stop(); // 先把正在播放的停犊子了
		ac.src = 'cloud://cloud1-0gycvki2e3212ab3.636c-cloud1-0gycvki2e3212ab3-1305395037/audios/constellation/tian.m4a';  // 田src
		ac.onCanplay(() => {
			console.log('can can need!');
			ac.play();
			
			ac.src = this.data.kecheng.audio_list[e.currentTarget.id].mediaUrl;
			console.log(ac.src);
			ac.onCanplay(() => {
				console.log('can can need!');
				ac.play();
			});
			// ac.play();
			// e.currentTarget
		});
	},
	
	loadComment: function (kid) {
		wx.cloud.callFunction({
			name: "findcomments",
			data: {
				kecheng_id: kid,
			},
			success: (res) => {
				console.log("[云函数] [findcomments]", res);
				this.setData({
					comments1: res.result.comment1,
					comments2: res.result.comment2,
				});
				console.log(this.data.comments1);
				console.log(this.data.comments2);
			},
			fail: (err) => {
				console.error("[云函数] [findcomments] 调用失败", err);
			},
		});
	},
	
	toask: function () {
		//授权登陆
		if (this.data.logged == false) {
			app.getUserProfile();
		} else {
			this.setData({
				ask: true,
			});
		}
	},
	
	tocomment: function () {
		//授权登陆
		if (this.data.logged == false) {
			app.getUserProfile();
		} else {
			this.setData({
				pinglun: true,
			});
		}
	},
	
	toreply: function (e) {
		console.log(e);
		//授权登陆
		if (this.data.logged == false) {
			app.getUserProfile();
		} else {
			this.setData({
				reply: true,
				com1_id: e.currentTarget.dataset.cid,
				ask1_id: e.currentTarget.dataset.cid,
				user_recv_id: e.currentTarget.dataset.recv_uid,
				user_recv_name: e.currentTarget.dataset.name,
			});
		}
	},
	
	toreply2: function (e) {
		console.log(e);
		//授权登陆
		if (this.data.logged == false) {
			app.getUserProfile();
		} else {
			this.setData({
				ask: true,
				reply2: true,
				com1_id: e.currentTarget.dataset.cid,
				ask1_id: e.currentTarget.dataset.cid,
				user_recv_id: e.currentTarget.dataset.recv_uid,
				user_recv_name: e.currentTarget.dataset.name,
			});
		}
	},
	
	bindinput: function (e) {
		// console.log(e);
		// console.log(e.detail.text.length);
		this.setData({
			current_comment: e.detail,
		});
		if (e.detail.text.length != 1 && e.detail.text.length != 0) {
			this.setData({
				cantsubmit: false,
			});
		} else {
			this.setData({
				cantsubmit: true,
			});
		}
	},
	
	submitcomment: function (e) {
		var currenttime = this.currenttime(new Date());
		
		//显示评论
		// var com1 = this.data.comments1;
		// com1.unshift({
		//   comment_text: this.data.current_comment,
		//   comment_time: currenttime,
		//   kecheng_id: this.data.kecheng._id,
		//   love: 0,
		//   userList: this.data.userList,
		// });
		
		this.setData({
			pinglun: false,
			// comments1: com1,
		});
		
		//插入数据库
		db.collection("comments1").add({
			data: {
				comment_text: this.data.current_comment,
				comment_time: currenttime,
				kecheng_id: this.data.kecheng._id,
				love: 0,
				is_delete: false,
				is_handled: false,
			},
			success: (res) => {
				this.setData({
					current_comment: "",
				});
				this.loadComment(this.data.kid);
				this.loadAsks(this.data.kid);
			},
		});
	},
	
	submitreply: function (e) {
		var currenttime = this.currenttime(new Date());
		//显示评论
		// var com2 = this.data.comments2;
		// com2.unshift({
		//   comment_text: this.data.current_comment,
		//   comment_time: currenttime,
		//   kecheng_id: this.data.kecheng._id,
		//   love: 0,
		//   userList: this.data.userList,
		//   com1_id: this.data.com1_id,
		//   user_recv_name: this.data.user_recv_name,
		//   user_recv_id: this.data.user_recv_id,
		// });
		// console.log(com2);
		this.setData({
			reply: false,
			// comments2: com2,
		});
		// console.log(this.data.comments2);
		
		//插入数据库
		db.collection("comments2").add({
			data: {
				comment_text: this.data.current_comment,
				comment_time: currenttime,
				kecheng_id: this.data.kecheng._id,
				love: 0,
				com1_id: this.data.com1_id,
				user_recv_name: this.data.user_recv_name,
				user_recv_id: this.data.user_recv_id,
				is_delete: false,
				is_handled: false,
			},
			success: (res) => {
				this.setData({
					current_comment: "",
				});
				this.loadComment(this.data.kid);
				this.loadAsks(this.data.kid);
			},
		});
	},
	
	getUserProfile() {
		// 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认
		// 开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
		
		/*
		wx.getUserProfile({
		  desc: "用于完善会员资料", // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
		  success: (res) => {
			console.log(res);
			wx.cloud.callFunction({
			  name: "add_user",
			  data: {
				nickName: res.userInfo.nickName,
				avatarUrl: res.userInfo.avatarUrl,
			  },
			  success: (res2) => {
				this.setData({
				  logged: true,
				  userList: res2.result.data,
				});
				app.globalData.user = res2.result.data[0];
			  },
			  fail: (err) => {
				console.error("[云函数] [add_user] 调用失败", err);
			  },
			});
			// db.collection("users").add({
			//   // data 字段表示需新增的 JSON 数据
			//   data: {
			//     nickName: res.userInfo.nickName,
			//     avatarUrl: res.userInfo.avatarUrl,
			//     identityType: "student",
			//     isBanned: false,
			//   },
			//   success: function (res) {
			//     console.log(res);
			//   },
			// });
		  },
	
		  fail: (err) => {
			console.log(err);
		  }
		});
		*/
	},
	
	getopeninfo() {
		db.collection("users")
		.where({
			_openid: app.globalData.openid,
		})
		.get({
			success: (res) => {
				if (res.data.length == 0) {
					this.setData({
						logged: false,
					});
				} else {
					this.setData({
						logged: true,
						userList: res.data,
					});
				}
			},
		});
	},
	getopeninfoWithReplyAction() {
		db.collection("users")
		.where({
			_openid: app.globalData.openid,
		})
		.get({
			success: (res) => {
				if (res.data.length == 0) {
					this.setData({
						logged: false,
					});
				} else {
					this.setData({
						logged: true,
						userList: res.data,
					});
					let askItem = app.globalData.askItem;
					let e = {};
					e.currentTarget = {};
					e.currentTarget.dataset = {};
					e.currentTarget.dataset.cid = askItem._id;
					e.currentTarget.dataset.recv_uid = askItem.userList[0]._openid;
					e.currentTarget.dataset.name = askItem.userList[0].nickName;
					this.toreply2(e);
				}
			},
		});
	},
	
	currenttime: function (d) {
		var str = "";
		//str += d.getFullYear() + '年'; //获取当前年份
		str += d.getMonth() + 1 + "-"; //获取当前月份（0——11）
		str += d.getDate() + " ";
		if (parseInt(d.getHours()) < 10) {
			str += "0" + d.getHours() + ":";
		} else {
			str += d.getHours() + ":";
		}
		if (parseInt(d.getMinutes()) < 10) {
			str += "0" + d.getMinutes() + "";
		} else {
			str += d.getMinutes() + "";
		}
		//str += d.getSeconds() + '秒';
		// console.log(str);
		return str;
	},
	
	losefocus: function () {
		this.setData({
			pinglun: false,
		});
	},
	
	updatePosition(keyboardHeight) {
		const toolbarHeight = 50;
		const {
			windowHeight,
			platform
		} = wx.getSystemInfoSync();
		let editorHeight =
			keyboardHeight > 0 ?
				windowHeight - keyboardHeight - toolbarHeight :
				windowHeight;
		if (keyboardHeight === 0) {
			this.setData({
				editorHeight,
				keyboardHeight,
				toolBarHeight: this.data.isIOS ? 50 + this._safeHeight : 50,
				safeHeight: this._safeHeight,
			});
		} else {
			this.setData({
				editorHeight,
				keyboardHeight,
				toolBarHeight: 50,
				safeHeight: 0,
			});
		}
	},
	calNavigationBarAndStatusBar() {
		const systemInfo = wx.getSystemInfoSync();
		const {
			statusBarHeight,
			platform
		} = systemInfo;
		const isIOS = platform === "ios";
		const navigationBarHeight = isIOS ? 44 : 48;
		return statusBarHeight + navigationBarHeight;
	},
	onEditorReady() {
		const that = this;
		wx.createSelectorQuery()
		.select("#editor")
		.context(function (res) {
			that.editorCtx = res.context;
		})
		.exec();
	},
	blur() {
		this.editorCtx.blur();
	},
	format(e) {
		let {
			name,
			value
		} = e.target.dataset;
		if (!name) return;
		// console.log('format', name, value)
		this.editorCtx.format(name, value);
	},
	onStatusChange(e) {
		const formats = e.detail;
		this.setData({
			formats
		});
	},
	insertDivider() {
		this.editorCtx.insertDivider({
			success: function () {
				console.log("insert divider success");
			},
		});
	},
	clear() {
		this.editorCtx.clear({
			success: function (res) {
				console.log("clear success");
			},
		});
	},
	removeFormat() {
		this.editorCtx.removeFormat();
	},
	insertDate() {
		const date = new Date();
		const formatDate = `${date.getFullYear()}/${
			date.getMonth() + 1
		}/${date.getDate()}`;
		this.editorCtx.insertText({
			text: formatDate,
		});
	},
	insertImage() {
		var fileID = "";
		const that = this;
		wx.showLoading({
			title: "加载中",
		});
		wx.chooseImage({
			count: 1,
			success: function (res) {
				wx.cloud.uploadFile({
					cloudPath: "img/" +
						new Date().getTime() +
						"-" +
						Math.floor(Math.random() * 1000) +
						".jpeg",
					filePath: res.tempFilePaths[0], // 文件路径
					success: (res) => {
						// get resource ID
						console.log(res.fileID);
						fileID = res.fileID;
						
						that.editorCtx.insertImage({
							src: fileID,
							data: {
								id: "abcd",
								role: "god",
							},
							width: "80%",
							success: function () {
								console.log("insert image success");
								wx.hideLoading();
							},
						});
					},
					fail: (err) => {
						// handle error
					},
				});
			},
		});
	},
	
	/**
	 * 触发：用户提交留言
	 */
	getContent: async function () {
		const lid = this.data.kecheng._id
		const hasPrivilege = await asyncCheckLessonPrivilege(lid)
		if (!hasPrivilege) return wx.showModal({title: '留言失败', content: '原因：您没有权限'})
		
		// todo: 这个必须放在最开头，确实很奇怪
		await wx.requestSubscribeMessage({tmplIds: ['kpg44pswUwCyF2aNaZXgljrznbSpJO9MeODqFfdMBDQ']})
		
		await db.collection("asks1").add({
			data: {
				create_time: new Date().getTime(),
				html: (await this.editorCtx.getContents()).html,
				//_id: time,
				love: 0,
				is_delete: false,
				is_handled: false,
				mid: this.data.mid,
				kecheng_id: lid,
			},
		})
		
		this.setData({ask: false});
		
		const {mid} = this.data
		console.log({mid, lid})
		this.loadAsks(lid)
		console.log("current asks:", this.data.asks1);
		
		const {data: teachers} = await db.collection("users").where({
			identityType: "teacher",
			ownedModules: {"$elemMatch": {kid: lid}}
		}).get();
		
		const result = await Promise.all(teachers.map(async ({_openid}) => await wx.cloud.callFunction({
			name: FUNC_SEND_NOTIFICATION,
			data: {
				msgTitle: '你好，你负责的客户有新的问题需要你回答。',
				toUserOpenID: _openid,
				title: getLastElem(this.data.kecheng.kecheng_name.split('.')),
				path: "pages/kecheng/kechengplay/kechengplay?showAsk=true&mid=" + this.data.mid + "&kid=" + this.data.kecheng._id, // + "&type=" + this.data.watchType,
			}
		})))
		
		console.log("send result: ", result)
		console.log('巨业无比！')
	},
	
	getContent2: function () {
		const that = this;
		that.editorCtx.getContents({
			success: (res) => {
				console.log(res);
				var time = this.currenttime(new Date());
				// var asks2 = this.data.asks2;
				// asks2.unshift({
				//   create_time: time,
				//   kecheng_id: this.data.kecheng._id,
				//   html: res.html,
				//   userList: this.data.userList,
				//   user_recv_name: this.data.user_recv_name,
				//   user_recv_id: this.data.user_recv_id,
				//   ask1_id: this.data.ask1_id,
				//   love: 0,
				// });
				
				db.collection("asks2").add({
					data: {
						ask1_id: this.data.ask1_id,
						create_time: new Date().getTime(),
						kecheng_id: this.data.kecheng._id,
						html: res.html,
						user_recv_name: this.data.user_recv_name,
						user_recv_id: this.data.user_recv_id,
						love: 0,
						is_delete: false,
						is_handled: false,
						mid: this.data.mid,
					},
					success: async (res) => {
						this.setData({
							ask: false,
							reply2: false,
							// asks2: asks2,
						});
						this.loadAsks(this.data.kid);
						
						const resReply = await wx.cloud.callFunction({
							name: FUNC_SEND_NOTIFICATION,
							data: {
								msgTitle: '您好，您提问的问题有新的回复了。',
								toUserOpenID: this.data.user_recv_id,
								title: getLastElem(this.data.kecheng.kecheng_name.split('.')),
								path: "pages/kecheng/kechengplay/kechengplay?showAsk=true&mid=" + this.data.mid + "&kid=" + this.data.kecheng._id, // + "&type=" + this.data.watchType,
							}
						})
						console.log({resReply})
					},
					error: console.error,
					
				});
				
				//if (this.data.watchType == 14) {
				db.collection("asks1")
				.doc(this.data.ask1_id)
				.update({
					data: {
						is_handled: true
					},
				});
				db.collection("asks1")
				.doc(this.data.ask1_id)
				.get()
				.then(res => {
					console.log(res.data._openid);
					var now = new Date();
					var year = now.getFullYear(); //得到年份
					var month = now.getMonth() + 1;//得到月份
					var date = now.getDate();//得到日期
					// var day = now.getDay();//得到周几
					var hour = now.getHours();//得到小时数
					var minute = now.getMinutes();//得到分钟数
					//var second= now.getSeconds();//得到秒数
					console.log(res.data._openid);
					
					// todo: service message 的 page href 无法访问
					//发订阅消息
					wx.cloud.callFunction({
						name: "send_template_msg",
						data: {
							kecheng_name: that.data.kecheng.kecheng_name,
							user_name: this.data.user_recv_name,
							time: year + '-' + month + '-' + date + ' ' + hour + ':' + minute,
							touser: res.data._openid
						},
						//data: param,
						success: (res) => {
							console.log("[云函数] [send_template_msg]", res);
						},
						fail: (err) => {
							console.error("[云函数] [send_template_msg] 调用失败", err);
						},
					});
					console.log(res.data._openid);
				});
				//}
				
				/*
				 //消息提醒
				db.collection('tixing').add({
				   data:{
				user_send_id:app.globalData.openid,
				user_recv_id:this.data.user_recv_id,
				create_time: time,
				kecheng_id:this.data.kecheng._id,
				html:res.html,
				checked:false
					 }
				   })
		*/
			},
		});
	},
	
	back: function () {
		this.setData({
			ask: false,
		});
	},
	
	readOnlyChange() {
		this.setData({
			readOnly: !this.data.readOnly,
		});
	},
	
	loadAsks: function (kid) {
		wx.cloud.callFunction({
			name: "findasks",
			data: {
				kecheng_id: kid,
			},
			success: (res) => {
				console.log("[云函数] [findasks]", res);
				var a1 = res.result.asks1;
				var a2 = res.result.asks2;
				for (var i = 0; i < a1.length; i++) {
					a1[i].checked = false;
					a1[i].color = "#4186bd";
					a1[i].create_time = this.currenttime(new Date(a1[i].create_time));
				}
				for (var i = 0; i < a2.length; i++) {
					a2[i].checked = false;
					a2[i].color = "#4186bd";
					a2[i].create_time = this.currenttime(new Date(a2[i].create_time));
				}
				this.setData({
					asks1: a1,
					asks2: a2,
				});
				console.log(this.data.asks1);
				console.log(this.data.asks2);
			},
			fail: (err) => {
				console.error("[云函数] [findasks] 调用失败", err);
			},
		});
	},
	
	tolove: function (e) {
		console.log(e);
		var asks1 = this.data.asks1;
		var ask1 = e.currentTarget.dataset.cid;
		var index = asks1.findIndex((i) => i._id === ask1._id);
		
		if (ask1.checked == false) {
			asks1[index].checked = true;
			asks1[index].love = asks1[index].love + 1;
			asks1[index].color = "#ea68a2";
		} else {
			asks1[index].checked = false;
			asks1[index].love = asks1[index].love - 1;
			asks1[index].color = "#4186bd";
		}
		
		this.setData({
			asks1: asks1,
		});
		db.collection("asks1")
		.doc(ask1._id)
		.update({
			// data 传入需要局部更新的数据
			data: {
				// 表示将 done 字段置为 true
				love: asks1[index].love,
			},
			success: function (res) {
				console.log(res.data);
			},
		});
	},
	toDelete: function (e) {
		console.log(e);
		let asks1 = this.data.asks1;
		for (let i = 0; i < asks1.length; i++) {
			if (asks1[i]._id == e.currentTarget.dataset.cid._id) {
				asks1[i].is_delete = true;
				this.setData({
					asks1: asks1,
				});
				db.collection("asks1").doc(asks1[i]._id).remove();
				break;
			}
		}
	},
	
	tolove_2: function (e) {
		var asks2 = this.data.asks2;
		var ask2 = e.currentTarget.dataset.cid;
		var index = asks2.findIndex((i) => i._id === ask2._id);
		if (ask2.checked == false) {
			asks2[index].checked = true;
			asks2[index].love = asks2[index].love + 1;
			asks2[index].color = "#ea68a2";
		} else {
			asks2[index].checked = false;
			asks2[index].love = asks2[index].love - 1;
			asks2[index].color = "#4186bd";
		}
		
		this.setData({
			asks2: asks2,
		});
		
		db.collection("asks2")
		.doc(ask2._id)
		.update({
			// data 传入需要局部更新的数据
			data: {
				// 表示将 done 字段置为 true
				love: asks2[index].love,
			},
			success: function (res) {
				console.log(res.data);
			},
		});
	},
	
	todelete: function (e) {
		if (e.currentTarget.dataset.ask.asd || sda) {
			db.collection("asks1")
			.doc("")
			.remove({
				success: function (res) {
					console.log(res.data);
				},
			});
		}
	},
	toDelete2: function (e) {
		console.log(e);
		let asks2 = this.data.asks2;
		for (let i = 0; i < asks2.length; i++) {
			if (asks2[i]._id == e.currentTarget.dataset.cid._id) {
				asks2[i].is_delete = true;
				this.setData({
					asks2: asks2,
				});
				db.collection("asks2").doc(asks2[i]._id).remove();
				break;
			}
		}
	},
	
	jumpvideo: function (e) {
		console.log(e);
		this.videoContext.seek(e.currentTarget.dataset.time.time);
		this.videoContext.play();
	},
	
	tobefore: function (e) {
		if (this.data.kecheng.o_id - 1 < 1) {
			return;
		}
		
		// 试图获取url
		db.collection("kechengs_safe")
		.where({
			mid: this.data.mid,
			o_id: this.data.kecheng.o_id - 1,
		})
		.get({
			success: (res) => {
				let kid = res.data[0]._id
				wx.cloud.callFunction({
					name: 'getVideoAddress',
					data: {
						kid: kid,
					},
					success: (res_url) => {
						if (res_url.result) {
							let video_url = res_url.result.url;
							wx.redirectTo({
								url:
									"../kechengplay/kechengplay?kid=" +
									kid +
									"&mid=" +
									this.data.mid +
									"&is_audio=" +
									this.data.is_audio +
									"&video_url=" +
									video_url,
							});
						} else {
							wx.showToast({
								title: "你没有权限查看该课程！",
								icon: "none",
							});
						}
					},
					fail: (err) => {
						console.error("野猪拉屎失败！", err);
					},
				});
			},
			fail: (res) => {
			
			},
		});
	},
	
	tonext: function (e) {
		// 试图获取url
		db.collection("kechengs_safe")
		.where({
			mid: this.data.mid,
			o_id: this.data.kecheng.o_id + 1,
		})
		.get({
			success: (res) => {
				let kid = res.data[0]._id
				wx.cloud.callFunction({
					name: 'getVideoAddress',
					data: {
						kid: kid,
					},
					success: (res_url) => {
						if (res_url.result) {
							let video_url = res_url.result.url;
							wx.redirectTo({
								url:
									"../kechengplay/kechengplay?kid=" +
									kid +
									"&mid=" +
									this.data.mid +
									"&is_audio=" +
									this.data.is_audio +
									"&video_url=" +
									video_url,
							});
						} else {
							wx.showToast({
								title: "你没有权限查看该课程！",
								icon: "none",
							});
						}
					},
					fail: (err) => {
						console.error("野猪拉屎失败！", err);
					},
				});
			},
			fail: (res) => {
			
			},
		});
	},
	
	topreview: function (e) {
		wx.previewImage({
			current: "", // 当前显示图片的http链接
			urls: [e.currentTarget.dataset.url], // 需要预览的图片http链接列表
			showmenu: false,
		});
	},
	
	//试听不可以跳转
	loadshiting: function (shiting) {
		if (shiting == "1" || shiting == 1) {
			this.setData({
				shiting: 1,
			});
		}
	},
});
