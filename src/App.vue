<template>
  <div class="app-container">
    <h1>Vue2 + vue-codemirror 动态参数输入框示例</h1>
    
    <div class="description">
      <p><strong>功能说明：</strong></p>
      <ul>
        <li>输入普通文本，正常显示</li>
        <li>输入 <kbd>{</kbd> 键，弹出参数选择列表</li>
        <li>选择参数后插入为 <code v-pre>{{变量名称}}</code> 格式</li>
        <li>变量会高亮显示（绿色背景）</li>
        <li>删除时光标在变量内部时，会整体删除整个变量</li>
        <li>鼠标悬浮在变量上，会显示参数说明 dialog</li>
        <li>按 <kbd>↑</kbd> <kbd>↓</kbd> 键选择参数，<kbd>Enter</kbd> 确认，<kbd>Esc</kbd> 关闭</li>
      </ul>
    </div>
    
    <div class="editor-section">
      <h2>动态参数编辑器</h2>
      <DynamicParamEditor ref="paramEditor" />
    </div>
    
    <div class="output-section">
      <h2>当前内容</h2>
      <textarea 
        :value="currentContent" 
        readonly 
        class="output-textarea"
        placeholder="编辑器的实时内容会显示在这里..."
      ></textarea>
    </div>
  </div>
</template>

<script>
/**
 * App.vue - 主应用组件
 * 
 * 这个组件是整个应用的入口组件，它包含：
 * 1. 功能说明区域
 * 2. 动态参数编辑器组件
 * 3. 输出展示区域
 * 
 * 在实际项目中，你可以根据需要调整布局和样式
 */
import DynamicParamEditor from './components/DynamicParamEditor.vue'

export default {
  name: 'App',
  components: {
    DynamicParamEditor
  },
  data() {
    return {
      // 当前编辑器的内容
      currentContent: ''
    }
  },
  mounted() {
    // 监听编辑器内容变化
    // 通过 ref 获取子组件实例，监听其内容变化事件
    this.$refs.paramEditor.$on('content-change', (content) => {
      this.currentContent = content
    })
  }
}
</script>

<style scoped>
.app-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #333;
  margin-bottom: 20px;
  font-size: 28px;
}

h2 {
  color: #555;
  margin: 20px 0 10px;
  font-size: 20px;
}

.description {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px 20px;
  margin-bottom: 20px;
}

.description ul {
  margin: 10px 0 0 20px;
}

.description li {
  margin: 5px 0;
  line-height: 1.6;
}

kbd {
  background: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 3px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 0.9em;
}

code {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}

.editor-section {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.output-section {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
}

.output-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  resize: vertical;
  background: #f8f9fa;
}

.output-textarea:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}
</style>
