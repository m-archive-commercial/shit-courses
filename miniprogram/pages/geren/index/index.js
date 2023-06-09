//index.js
const app = getApp();
const db = wx.cloud.database();
Page({
  data: {
    logged: false,
    user: {
      nickName: "",
      avatarUrl: "./user-unlogin.png",
    },
    showCommentDot: false,
    asks1: [],
    asks2: [],
    canShowBuy: true,
  },

  onLoad: function () {
    // 获取用户信息
    if (!app.globalData.openid) {
      this.login();
    } else {
      this.getopeninfo();
    }

    this.setData({
      canShowBuy: !app.globalData.is_ios,
    });
  },
  onShow() {
    //db.collection
    if (app.globalData.openid) {
      this.loadtixing();
    }
  },

  // 上传图片
  doUpload: function () {
    // 选择图片
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: function (res) {
        wx.showLoading({
          title: "上传中",
        });

        const filePath = res.tempFilePaths[0];

        // 上传图片
        const cloudPath = `my-image${filePath.match(/\.[^.]+?$/)[0]}`;
        wx.cloud.uploadFile({
          cloudPath,
          filePath,
          success: (res) => {
            console.log("[上传文件] 成功：", res);

            app.globalData.fileID = res.fileID;
            app.globalData.cloudPath = cloudPath;
            app.globalData.imagePath = filePath;

            wx.navigateTo({
              url: "../storageConsole/storageConsole",
            });
          },
          fail: (e) => {
            console.error("[上传文件] 失败：", e);
            wx.showToast({
              icon: "none",
              title: "上传失败",
            });
          },
          complete: () => {
            wx.hideLoading();
          },
        });
      },
      fail: (e) => {
        console.error(e);
      },
    });
  },

  getUserProfile(e) {
    // wx.getUserProfile完犊子啦！现在要用狗日的获取头像昵称功能！
    app.getUserProfile();
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
            console.log(res.data[0])
            this.setData({
              logged: true,
              user: res.data[0],
            });
          }
        },
      });
  },

  tobuy: function (e) {
    wx.navigateTo({
      url: "../../kecheng/shop/shop",
    });
  },

  school: function (e) {
    wx.navigateTo({
      url: "../../kecheng/school_login/school_login",
    });
  },

  toadmin: function () {
    wx.navigateTo({
      url: "../admin/admin",
    });
  },

  tuikuan: function () {
    var date = new Date();
    wx.cloud.callFunction({
      name: "tuikuan",
      data: {
        order_id: "88540Bbb4o7HY9SSnAt",
        out_refund_no:
          "yun" + app.globalData.openid.slice(20) + date.getTime().toString(),
      },
      success: (res) => {
        console.log("[云函数] [tuikuan] : ", res.result);
      },
      fail: (err) => {
        console.error("[云函数] [tuikuan] 调用失败", err);
      },
    });
  },

  findorders: function () {
    wx.cloud.callFunction({
      name: "findorder",
      data: {
        out_trade_no: "2ab166ee72c6cvA8vYLqYJVMIt1",
      },
      success: (res) => {
        console.log(res);
      },
    });
  },
  loadtixing: function () {
    wx.cloud.callFunction({
      name: "findtixing",
      data: {
        uid: app.globalData.openid,
      },
      success: (res) => {
        console.log("[云函数] [findasks]", res);
        
        if(!res.result) return; // suppress bug of `ask2 of null`
        
        if (res.result.asks2 && res.result.asks2.length > 0) {
          let asks2 = res.result.asks2;
          this.setData({
            asks2: asks2,
          });
        }
        if (res.result.asks1 && res.result.asks1.length > 0) {
          let asks1 = res.result.asks1;

          this.setData({
            asks1: asks1,
          });
          if (asks1.length) {
            this.setData({
              showCommentDot: true,
            });
          } else {
            this.setData({
              showCommentDot: false,
            });
          }
        } else {
          this.setData({
            showCommentDot: false,
          });
        }
        console.log(this.data.asks2);
        console.log(this.data.asks1);
      },
      fail: (err) => {
        console.error("[云函数] [findasks] 调用失败", err);
      },
    });
  },
  login() {
    wx.showLoading({
      title: "获取openid中",
    });
    // 调用云函数
    wx.cloud.callFunction({
      name: "login",
      data: {},
      success: (res) => {
        console.log("[云函数] [login]  ", res.result);
        app.globalData.openid = res.result.openid;
        app.globalData.serverConfig = res.result.config;
        wx.hideLoading();
        this.getopeninfo();
      },
      fail: (err) => {
        console.error("[云函数] [login] 调用失败", err);
      },
    });
  },
});
