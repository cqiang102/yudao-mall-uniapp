import request from '@/sheep/request';

// 餐饮 - 会员收货地址（消费者端，M-23）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.member.MemberAddressController
// 前缀：/app-api  userId 一律由登录态注入，前端不传（防越权）
// 表：restaurant_member_address（m18_member_address.sql）
const RestaurantAddressApi = {
  // 我的地址列表（默认地址在前）
  getMyList: () => {
    return request({
      url: '/member/address/my-list',
      method: 'GET',
      custom: {
        showLoading: false,
      },
    });
  },
  // 创建地址 { name, phone, region, detail, defaultStatus }
  create: (data) => {
    return request({
      url: '/member/address/create',
      method: 'POST',
      data,
    });
  },
  // 更新地址（需带 id，归属由后端校验）
  update: (data) => {
    return request({
      url: '/member/address/update',
      method: 'PUT',
      data,
    });
  },
  // 删除地址
  delete: (id) => {
    return request({
      url: '/member/address/delete',
      method: 'DELETE',
      params: { id },
    });
  },
  // 设为默认地址
  setDefault: (id) => {
    return request({
      url: '/member/address/set-default',
      method: 'PUT',
      params: { id },
    });
  },
};

export default RestaurantAddressApi;
