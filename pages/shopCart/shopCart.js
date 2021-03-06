// pages/shopCart/shopCart.js
import Toast from '../../lib/vant-weapp/toast/toast';

const api = require('../../config/url.js');
const util = require('../../utils/util.js');
Page({
  //购物车
  /**
   * 页面的初始数据
   */
  data: {
    userId: 0,
    isLogin: false,
    noChecked: true,
    checkedAll: false,
    //isExpressFree: false,
    pageNo: 1, // 分页相关
    perPageCount: 30, // 每次请求的数量条数
    hasMore: true, // 标记是否还有更多
    totalPrice: 0,
    totalCount: 0,
    freightPrice: 0,
    difference: 0, //原价和实际售价的差值
    cartList: [],
    ids: [],
    shipping: 0,
    freight: 0,
    activity: "",
    isCheck: [],
    ConfirmOrder: {}

  },

  onLoad: function(options) {
    util.updateCartCount(); // 刷新购物车数量

  },

  // ========================
  onReady: function() {},
  onShow: function() {
    util.updateCartCount()
    let that = this
    util.request(api.ActivityDiscount, {}, "GET").then(function (res) {
      that.setData({
        activity: res.replace('\r\n',"")
      })
    });
    let isLogin = wx.getStorageSync('isLogin')
    let userId = wx.getStorageSync('userId')
    if (isLogin && userId) {
      this.changeCartList(userId, this.data.pageNo)
      this.setData({
        isLogin: isLogin,
        userId: userId
      })
    }
    this.setData({
      cartList: [],
      pageNo: 1, // 分页相关
      hasMore: true, // 标记是否还有更多
      totalPrice: 0,
      difference: 0
    });

  },
  onHide: function() {},
  onUnload: function() {},
  onPullDownRefresh: function() {
    this.onShow()
  },
  onReachBottom: function() {
    let that = this
    let currentPageNo = this.data.pageNo + 1;
    if (this.data.hasMore) {
      that.setData({
        pageNo : currentPageNo
      })
      this.changeCartList(this.data.userId, currentPageNo);
    }
  },
  onShareAppMessage: function() {},
  //产品的购买数量
  changeCount: function(e) {
    let v = e.detail.value;
    let that = this
    let index = e.currentTarget.dataset.index;
    this.setData({
      [`cartList[${index}].count`]: v
    })
    util.request(api.updateCartList, {
      userId: this.data.userId,
      num: v,
      id: that.data.cartList[index].id
    }, "POST").then(function(res) {
      console.log(res)
    });
    this.setCheckedTotalPrice();
    this.setCheckedTotalCount();
  },
  //展示购物车
  changeCartList(userId, pageNo) {
    var that = this

    //首页商品列表
    util.request(api.CartList, {
      page: pageNo,
      userId: userId,
      limit: that.data.perPageCount
    }, "GET").then(function(res) {
      let currentGoodsArray = that.data.cartList.concat(res.list);
      if (currentGoodsArray.length === res.totalCount) { // 如果当前返回页面跟总页面数相同，说明没有更多内容了
        that.setData({
          hasMore: false
        })
      }
      that.setData({
        cartList: currentGoodsArray,
      });
      that.judgeCheckedAll();
      that.setCheckedTotalCount();
      that.setCheckedTotalPrice();
    });

  },

  // 产品选中
  changeCheck: function(e) {
    let index = e.currentTarget.dataset.index;
    let isCheck = []

    this.setData({
      [`cartList[${index}].checked`]: e.detail
    })
    for (let i = 0; i < this.data.cartList.length; i++) {
      if (this.data.cartList[i].checked === true) {
        isCheck.push(this.data.cartList[i].id)
      }
    }
    this.setData({
      isCheck: isCheck
    })
    console.log(isCheck)
    this.judgeCheckedAll();
    this.setCheckedTotalCount();
    this.setCheckedTotalPrice();
  },

  //底部统计全选事件
  changeCheckedAll: function(e) {

    if (this.data.cartList.length > 0){
      let isCheck = []
      this.setData({
        checkedAll: e.detail
      });
      for (let i = 0; i < this.data.cartList.length; i++) {
        this.setData({
          [`cartList[${i}].checked`]: e.detail
        })
        if (this.data.checkedAll === true) {
          isCheck.push(this.data.cartList[i].id)
        }
      }

      this.setData({
        isCheck: isCheck
      })
      console.log(isCheck)
      this.judgeCheckedAll();
      this.setCheckedTotalCount();
      this.setCheckedTotalPrice();
    }else {
      this.setData({
        checkedAll: false
      });
    }

  },
  //选中的产品数量
  setCheckedTotalCount: function() {
    let totalCount = 0
    this.data.cartList.forEach(function(v) {
      if (v.checked) {
        totalCount += v.count
      }
    })
    this.setData({
      totalCount: totalCount
    })
  },
  //删除
  deleteProduct: function(e) {
    let id = e.currentTarget.dataset.value.id;
    let data = [];
    let ids = [];
    let that = this
    this.data.cartList.forEach(function(v) {
      if (id != v.id) {
        data.push(v);
      }
    })
    this.setData({
      cartList: data,
      ids: id
    })
    util.request(api.deleteCartList, {
      id: this.data.ids
    }, "POST").then(function(res) {
      console.log(res)
      that.updateHistory();
    });
    this.judgeCheckedAll();
    this.setCheckedTotalCount();
    this.setCheckedTotalPrice();
  },
  //改变后的列表
  updateHistory: function(e) {
    wx.setStorageSync("cartList", this.data.cartList);
    util.updateCartCount()
  },

  //选中的产品总价
  setCheckedTotalPrice: function() {
    let totalPrice = 0;
    let difference = 0;
    let that = this

    this.data.cartList.forEach(function(v) {
      console.log(v)
      if (v.checked) {
        difference += v.price * v.count;

        setTimeout(function () {
          util.request(api.CartPrice,{
            userId: that.data.userId,
            ids : that.data.isCheck
          },"POST").then(function (res) {
            totalPrice = res
            that.setData({
              totalPrice: Number(totalPrice.toFixed(2)),
              difference: Number((difference - totalPrice).toFixed(2))
            })
          })
      }, 200);
       
      }else {
        that.setData({
          totalPrice : 0,
          difference : 0
        })
      }
    })


  },

  //底部统计栏下单事件
  checkout: function() {
    let that = this
    if (this.data.noChecked) {
      return;
    }
    // 购物车数据存入缓存
    //wx.setStorageSync("cartList", this.data.cartList);
    //wx.setStorageSync("totalPrice", this.data.totalPrice);
    //wx.setStorageSync("isExpressFree", this.data.isExpressFree)

    
    //确认订单接口
    util.request(api.OrderBuyInfo, {
      ids: this.data.isCheck,
      userId: that.data.userId
    }, "POST").then(function(res) {
      that.setData({
        ConfirmOrder: res
      })
      wx.setStorageSync("ConfirmOrder", that.data.ConfirmOrder)
      wx.navigateTo({
        url: '/pages/order/confirmOrder/confirmOrder'
      });
    });
  },

  //登陆验证
  checkLogin: function() {
    if (!this.data.isLogin) {
      wx.navigateTo({
        url: '/pages/login/login',
      })
    } else {
      return true
    }
  },

  judgeCheckedAll: function() {
   if (this.data.cartList.length > 0){
      var noChecked = true;
      this.data.cartList.forEach(function(v) {
        if (v.checked) {
          noChecked = false;
          return;
        }
      })
      var checkedAll = true;
      this.data.cartList.forEach(function(v) {
        if (!v.checked) {
          checkedAll = false;
          return;
        }
      })
    }else {
      noChecked = true;
     checkedAll = false;
    }


    this.setData({
      noChecked: noChecked,
      checkedAll: checkedAll
    })
  },
  
  //去商品详情
  toProduct:function (e) {
    let data = e.currentTarget.dataset.value;
    if(data.goodsId){
      wx.navigateTo({
        url: '/pages/product/product?id=' + data.goodsId,
      })
    }
  }
});