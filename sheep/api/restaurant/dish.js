import request from '@/sheep/request';

// 餐饮 - 菜品 / 分类（消费者端）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.dish.AppDishController
// 前缀：/app-api  userType=MEMBER（会员 token 自动由 sheep/request 注入）
const RestaurantDishApi = {
  // 在售分类列表（菜单 tab 用）
  getCategoryList: () => {
    return request({
      url: '/member/dish/category-list',
      method: 'GET',
      custom: {
        showLoading: false,
      },
    });
  },
  // 在售菜品列表（点餐用），categoryId 可选
  getDishSimpleList: (categoryId) => {
    return request({
      url: '/member/dish/simple-list',
      method: 'GET',
      params: categoryId ? { categoryId } : {},
      custom: {
        showLoading: false,
      },
    });
  },
};

export default RestaurantDishApi;
