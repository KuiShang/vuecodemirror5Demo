import Vue from 'vue'
import App from './App.vue'

import VueCodemirror from 'vue-codemirror'
import 'codemirror/lib/codemirror.css'

Vue.use(VueCodemirror)

Vue.config.productionTip = false

new Vue({
  render: h => h(App)
}).$mount('#app')
