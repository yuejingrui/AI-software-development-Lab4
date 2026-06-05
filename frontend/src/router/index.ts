import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue')
    },
    {
      path: '/plan/:planId',
      name: 'plan-detail',
      component: () => import('@/views/PlanDetailView.vue'),
      props: true
    },
    {
      path: '/day/:date',
      name: 'day-detail',
      component: () => import('@/views/DayDetailView.vue')
    }
  ]
})

export default router
