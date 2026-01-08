<template>
  <div class="dynamic-param-editor">
    <!-- 
      codemirror 编辑器组件
      这是 vue-codemirror 的核心组件，用于提供 CodeMirror 编辑器功能
      
      主要属性说明：
      - value: 编辑器的初始内容（双向绑定）
      - options: CodeMirror 的配置选项
      - events: 需要监听的事件数组
      
      vue-codemirror 组件会自动处理：
      1. 编辑器的创建和销毁
      2. 内容变化时的双向同步
      3. 选项的响应式更新
    -->
    <codemirror
      ref="cmEditor"
      v-model="code"
      :options="cmOptions"
      :events="['changes', 'cursorActivity', 'keydown']"
      @changes="onCodeMirrorChanges"
      @cursorActivity="onCursorActivity"
      @keydown="onKeydown"
    ></codemirror>
    
    <!-- 
      参数选择列表弹窗
      使用 absolute 定位显示在光标附近
      只有当 showParamList 为 true 时才显示
      
      样式说明：
      - position: absolute 确保相对于编辑器定位
      - z-index: 1000 确保显示在其他元素上方
      - max-height: 200px 限制最大高度，超出部分滚动
    -->
    <div 
      v-if="showParamList" 
      class="param-list"
      :style="paramListStyle"
      @keydown.stop
    >
      <!-- 
        参数列表头部
        显示提示信息和快捷键说明
      -->
      <div class="param-list-header">
        <span>选择参数（按 ↑↓ 选择，Enter 确认，Esc 关闭）</span>
      </div>
      
      <!-- 
        参数列表项
        使用 v-for 遍历可用参数列表
        currentIndex 控制当前选中的项，用于键盘导航
        
        交互设计：
        - 鼠标悬停时高亮（hover 效果）
        - 选中项使用不同的背景色
      -->
      <div 
        v-for="(param, index) in filteredParams" 
        :key="param.name"
        class="param-item"
        :class="{ 'selected': index === currentIndex }"
        @click="selectParam(param)"
        @mouseenter="currentIndex = index"
      >
        <span class="param-name" v-text="getParamDisplay(param.name)"></span>
        <span class="param-description">{{ param.description }}</span>
      </div>
    </div>
    
    <!-- 
      变量悬浮提示 dialog
      当鼠标悬浮在变量上时显示
      显示参数的定义信息
      
      样式设计：
      - 半透明背景确保不遮挡下方内容
      - 圆角和阴影增加立体感
      - 避免遮挡鼠标便于查看
    -->
    <div 
      v-if="hoveredParam" 
      class="param-tooltip"
      :style="tooltipStyle"
    >
      <div class="tooltip-content">
        <strong>{{ hoveredParam.name }}</strong>
        <p>{{ hoveredParam.description }}</p>
        <p v-if="hoveredParam.example" class="tooltip-example">
          示例: {{ hoveredParam.example }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * DynamicParamEditor.vue - 动态参数输入框组件
 * 
 * ============================================
 * 组件功能说明
 * ============================================
 * 
 * 这是一个增强型的代码编辑器组件，在普通文本编辑的基础上，
 * 增加了动态参数功能。用户可以：
 * 
 * 1. 输入普通文本（与普通编辑器无异）
 * 2. 按 { 键呼出参数选择列表
 * 3. 选择参数后插入为 {{变量名称}} 格式
 * 4. 变量会高亮显示（绿色背景）
 * 5. 删除时光标在变量内部时，会整体删除
 * 6. 鼠标悬浮在变量上显示参数说明
 * 
 * ============================================
 * vue-codemirror 入门介绍
 * ============================================
 * 
 * vue-codemirror 是 CodeMirror 的 Vue 封装，提供：
 * - 双向数据绑定
 * - 响应式配置更新
 * - 事件透传
 * 
 * 核心概念：
 * 1. CodeMirror 实例 - 通过 ref 获取，访问底层 CodeMirror API
 * 2. options 配置 - 传递 CodeMirror 的各种配置项
 * 3. events 数组 - 指定需要转换为 Vue 事件的事件列表
 * 
 * 常用 API：
 * - cm.getValue() / cm.setValue() - 获取/设置编辑器内容
 * - cm.getCursor() - 获取光标位置
 * - cm.setCursor() - 设置光标位置
 * - cm.replaceRange() - 替换指定范围的文本
 * - cm.markText() - 标记文本范围（用于高亮）
 * - cm.addLineWidget() - 在行中添加自定义元素
 * 
 * ============================================
 */

export default {
  name: 'DynamicParamEditor',
  
  // 组件数据
  data() {
    return {
      // ============================================
      // 1. 编辑器内容（双向绑定）
      // ============================================
      // code 是 v-model 绑定的内容，vue-codemirror 会自动同步
      code: 'Hello { 欢迎使用动态参数编辑器，请输入 { 查看参数列表',
      
      // ============================================
      // 2. CodeMirror 配置选项
      // ====================================
      // mode: 'text/plain' 设置为纯文本模式
      // theme: 'default' 使用默认主题
      // lineNumbers: 关闭行号
      // lineWrapping: 关闭行包装
      // readOnly: false 允许编辑
      // scrollbarStyle: 'null' 隐藏滚动条
      cmOptions: {
        mode: 'text/plain',
        theme: 'default',
        lineNumbers: false,
        lineWrapping: false,
        readOnly: false,
        scrollbarStyle: 'null',
        extraKeys: {
          // 防止 Enter 键换行
          'Enter': () => { return CodeMirror.Pass }
        }
      },
      
      // ============================================
      // 3. 参数列表相关状态
      // ============================================
      showParamList: false,      // 是否显示参数列表
      currentIndex: 0,           // 当前选中的参数索引
      paramListPosition: null,   // 参数列表的位置 {top, left}
      paramFilter: '',           // 当前过滤文本
      paramStartPosition: null,   // 参数列表的起始位置，用于替换整个过滤区域
      
      // ============================================
      // 4. 可用参数列表
      // ============================================
      // 这些参数会在用户按 { 时显示供选择
      // 每个参数包含：name（变量名）、description（说明）、example（示例）
      availableParams: [
        {
          name: 'userId',
          description: '当前登录用户的ID',
          example: '12345'
        },
        {
          name: 'userName',
          description: '当前登录用户的名称',
          example: '张三'
        },
        {
          name: 'timestamp',
          description: '当前时间戳（毫秒）',
          example: '1700000000000'
        },
        {
          name: 'random',
          description: '随机数（0-1之间）',
          example: '0.456789'
        },
        {
          name: 'requestId',
          description: '请求唯一标识ID',
          example: 'req-abc123-def456'
        },
        {
          name: 'apiVersion',
          description: 'API版本号',
          example: 'v1.0.0'
        }
      ],
      
      // ============================================
      // 5. 变量标记管理
      // ============================================
      // 用于跟踪编辑器中的变量标记
      // 结构: { from: {line, ch}, to: {line, ch}, param: {...} }
      varMarkers: [],
      
      // ============================================
      // 6. 悬浮提示相关
      // ============================================
      hoveredParam: null,        // 当前悬浮的变量参数
      tooltipPosition: null,     // tooltip 位置
      
      // ============================================
      // 7. 删除相关状态
      // ============================================
      // 用于检测光标是否在变量内部
      lastCursorPos: null
    }
  },
  
  computed: {
    /**
     * 计算参数列表的样式
     * 动态设置位置确保显示在光标附近
     */
    paramListStyle() {
      if (!this.paramListPosition) {
        return {
          display: 'none'
        }
      }
      
      return {
        top: `${this.paramListPosition.top + 20}px`,
        left: `${this.paramListPosition.left}px`
      }
    },
    
    /**
     * 计算 tooltip 的样式
     */
    tooltipStyle() {
      if (!this.tooltipPosition) {
        return {
          display: 'none'
        }
      }
      
      return {
        top: `${this.tooltipPosition.top - 10}px`,
        left: `${this.tooltipPosition.left + 20}px`
      }
    },
    
    /**
     * 过滤后的参数列表
     * 根据paramFilter筛选可用参数
     */
    filteredParams() {
      if (!this.paramFilter) {
        return this.availableParams
      }
      const filter = this.paramFilter.toLowerCase()
      return this.availableParams.filter(param => 
        param.name.toLowerCase().includes(filter) ||
        param.description.toLowerCase().includes(filter)
      )
    }
  },
  
  mounted() {
    this.$nextTick(() => {
      if (this.$refs.cmEditor && this.$refs.cmEditor.codemirror) {
        this.initKeyBindings()
        this.refreshVariableMarkers()
      } else {
        setTimeout(() => {
          if (this.$refs.cmEditor && this.$refs.cmEditor.codemirror) {
            this.initKeyBindings()
            this.refreshVariableMarkers()
          }
        }, 100)
      }
    })
    
    document.addEventListener('click', this.handleOutsideClick)
  },
  
  beforeDestroy() {
    // 清理事件监听器
    document.removeEventListener('click', this.handleOutsideClick)
  },
  
  methods: {
    /**
     * 获取参数的显示文本
     * 
     * 由于 Vue 模板中不能直接使用 {{ '{{' }} 语法，
     * 需要通过方法返回格式化后的文本
     * 
     * @param {string} name - 参数名称
     * @returns {string} 格式化后的文本，如 {{userName}}
     */
    getParamDisplay(name) {
      return `{{${name}}}`
    },
    
    /**
     * 初始化键盘绑定
     * 
     * 动态绑定 { 键到 onOpenBrace 方法
     * 使用 CodeMirror 的 addKeyMap API
     */
    initKeyBindings() {
      console.log('initKeyBindings')
      const cm = this.$refs.cmEditor.codemirror
      
      cm.addKeyMap({
        name: 'paramSelector',
        '{': () => {
          this.onOpenBrace(cm)
        }
      }, 1)
    },
    
    /**
     * ============================================
     * CodeMirror 事件处理
     * ============================================
     */
    
    /**
     * 内容变化事件处理
     * 当编辑器内容变化时触发
     * 
     * @param {Object} cm - CodeMirror 实例
     * @param {Object} changeObj - 变化对象，包含 changes 信息
     */
    onCodeMirrorChanges(cm, changeObj) {
      // 刷新变量标记
      // 每次内容变化后都需要重新计算变量位置
      this.$nextTick(() => {
        this.refreshVariableMarkers()
      })
      
      // 通知父组件内容变化
      this.$emit('content-change', this.code)
    },
    
    /**
     * 光标活动事件处理
     * 当光标移动时触发
     * 
     * 用于：
     * 1. 更新参数列表位置
     * 2. 检测光标是否在变量内部
     */
    onCursorActivity(cm) {
      // 获取当前光标位置
      const cursor = cm.getCursor()
      
      // 更新参数列表位置（如果列表显示中）
      if (this.showParamList) {
        this.updateParamListPosition(cm)
      }
      
      // 检测光标是否在变量内部
      // 这会影响删除键的行为
      this.checkCursorInVariable(cm, cursor)
    },
    
    /**
     * 键盘事件处理
     * 这是主要的输入处理逻辑
     * 
     * @param {Object} cm - CodeMirror 实例
     * @param {Object} event - 原生键盘事件
     */
    onKeydown(cm, event) {
      if (this.showParamList) {
        // 如果是字母、数字、下划线等可输入字符，更新过滤文本并插入到编辑器
        if (event.key.match(/[a-zA-Z0-9_]/)) {
          event.preventDefault()
          event.stopPropagation()
          
          // 插入字符到编辑器
          cm.replaceRange(event.key, cm.getCursor())
          
          // 更新过滤文本
          this.updateParamFilter(event.key)
          return
        }
        // 如果是退格键，删除过滤文本的最后一个字符并从编辑器删除
        if (event.key === 'Backspace') {
          event.preventDefault()
          event.stopPropagation()
          
          // 从编辑器删除字符
          const cursor = cm.getCursor()
          if (cursor.ch > 0) {
            cm.replaceRange('', { line: cursor.line, ch: cursor.ch - 1 }, cursor)
          }
          
          // 删除过滤文本的最后一个字符
          this.removeLastFilterChar()
          return
        }
        // 如果是回车键，选择当前高亮的参数
        if (event.key === 'Enter') {
          event.preventDefault()
          event.stopPropagation()
          this.confirmParamSelection()
          return
        }
        // 现有导航逻辑
        this.handleParamListNavigation(event)
        return
      }
      
      if (event.key === '{') {
        this.onOpenBrace(cm, event)
        return
      }
      
      if (event.key === 'Backspace' || event.key === 'Delete') {
        this.handleDeleteKey(cm, event)
      }
    },
    
    /**
     * ============================================
     * 参数列表相关方法
     * ============================================
     */
    
    /**
     * 处理左花括号按键 - 显示参数列表
     * 
     * 这个方法在 extraKeys 中配置，当用户按 { 时调用
     * 
     * 逻辑：
     * 1. 先正常插入 { 字符
     * 2. 计算光标位置
     * 3. 显示参数列表
     * 
     * @param {Object} cm - CodeMirror 实例
     */
    onOpenBrace(cm, event) {
      console.log('onOpenBrace called')
      event.preventDefault()
      event.stopPropagation()
      
      const cursor = cm.getCursor()
      
      // 记录参数列表的起始位置
      this.paramStartPosition = { ...cursor }
      
      cm.replaceRange('{', cursor)
      
      this.showParamList = true
      this.currentIndex = 0
      this.paramFilter = ''  // 重置过滤文本
      this.updateParamListPosition(cm)
    },
    
    /**
     * 更新过滤文本
     * 向过滤文本中添加一个字符
     * 
     * @param {string} char - 要添加的字符
     */
    updateParamFilter(char) {
      this.paramFilter += char
      this.currentIndex = 0  // 重置选中索引
      
      // 检查过滤后的列表是否为空，如果为空则隐藏参数列表
      if (this.filteredParams.length === 0) {
        this.hideParamList()
      }
    },
    
    /**
     * 删除过滤文本的最后一个字符
     */
    removeLastFilterChar() {
      if (this.paramFilter) {
        this.paramFilter = this.paramFilter.slice(0, -1)
        this.currentIndex = 0  // 重置选中索引
        
        // 检查过滤后的列表是否为空，如果为空则隐藏参数列表
        if (this.filteredParams.length === 0) {
          this.hideParamList()
        }
      }
    },
    
    /**
     * 更新参数列表显示位置
     * 
     * 计算光标在屏幕上的坐标，将参数列表显示在旁边
     * 
     * 使用 CodeMirror 的 coordsFromPos 方法将文本位置转换为屏幕坐标
     * 
     * @param {Object} cm - CodeMirror 实例
     */
    updateParamListPosition(cm) {
      const cursor = cm.getCursor()
      
      // coordsFromPos 方法将文本位置（行号、列号）转换为屏幕坐标
      // 返回值包含 top、left、bottom 等属性
      const coords = cm.charCoords(cursor, 'page')
      console.log('coords', coords)
      this.paramListPosition = {
        top: coords.top,
        left: coords.left
      }
    },
    
    /**
     * 处理参数列表的键盘导航
     * 
     * 支持：
     * - ↑ / ↓: 选择上一个/下一个参数
     * - Enter: 确认选择
     * - Esc: 关闭列表
     * - Tab: 确认选择（可选）
     * 
     * @param {Object} event - 键盘事件
     */
    handleParamListNavigation(event) {
      const params = this.filteredParams
      
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          event.stopPropagation()
          this.currentIndex = (this.currentIndex - 1 + params.length) % params.length
          break
          
        case 'ArrowDown':
          event.preventDefault()
          event.stopPropagation()
          this.currentIndex = (this.currentIndex + 1) % params.length
          break
          
        case 'Enter':
          event.preventDefault()
          event.stopPropagation()
          this.confirmParamSelection()
          break
          
        case 'Escape':
          event.preventDefault()
          event.stopPropagation()
          this.hideParamList()
          break
          
        case 'Tab':
          event.preventDefault()
          event.stopPropagation()
          this.confirmParamSelection()
          break
      }
    },
    
    /**
     * 确认参数选择
     * 
     * 将选中的参数插入到编辑器中
     * 格式为：{{变量名称}}
     */
    confirmParamSelection() {
      const cm = this.$refs.cmEditor.codemirror
      const param = this.filteredParams[this.currentIndex]
      
      // 插入完整的参数格式，替换整个过滤区域
      const paramText = `{{${param.name}}}`
      
      // 如果有起始位置，替换从起始位置到当前光标位置的文本
      if (this.paramStartPosition) {
        cm.replaceRange(paramText, this.paramStartPosition, cm.getCursor())
      } else {
        cm.replaceRange(paramText, cm.getCursor())
      }
      
      // 关闭参数列表
      this.hideParamList()
      
      // 刷新变量标记
      this.$nextTick(() => {
        this.refreshVariableMarkers()
      })
    },
    
    /**
     * 选择参数（鼠标点击）
     * 
     * @param {Object} param - 选中的参数对象
     */
    selectParam(param) {
      const cm = this.$refs.cmEditor.codemirror
      
      // 插入参数，替换整个过滤区域
      const paramText = `{{${param.name}}}`
      
      // 如果有起始位置，替换从起始位置到当前光标位置的文本
      if (this.paramStartPosition) {
        cm.replaceRange(paramText, this.paramStartPosition, cm.getCursor())
      } else {
        cm.replaceRange(paramText, cm.getCursor())
      }
      
      // 关闭列表
      this.hideParamList()
      
      // 刷新标记
      this.$nextTick(() => {
        this.refreshVariableMarkers()
      })
    },
    
    /**
     * 隐藏参数列表
     */
    hideParamList() {
      this.showParamList = false
      this.paramListPosition = null
      this.paramFilter = ''  // 重置过滤文本
      this.paramStartPosition = null  // 重置起始位置
    },
    
    /**
     * ============================================
     * 变量高亮相关方法
     * ============================================
     */
    
    /**
     * 刷新所有变量标记
     * 
     * 扫描编辑器内容，查找所有 {{xxx}} 格式的变量，
     * 并为它们添加高亮标记
     * 
     * 实现思路：
     * 1. 清除现有的标记
     * 2. 使用正则表达式查找所有 {{...}} 模式
     * 3. 为每个匹配使用 markText 方法添加标记
     */
    refreshVariableMarkers() {
      const cm = this.$refs.cmEditor && this.$refs.cmEditor.codemirror
      
      if (!cm) {
        return
      }
      
      // 清除现有标记
      this.varMarkers.forEach(marker => {
        try {
          marker.clear()
        } catch (e) {
          // 标记可能已经被清除，忽略错误
        }
      })
      this.varMarkers = []
      
      const content = cm.getValue()
      const lines = content.split('\n')
      const varPattern = /\{\{([^}]+)\}\}/g
      
      // 遍历每一行查找变量
      lines.forEach((line, lineIndex) => {
        let match
        varPattern.lastIndex = 0
        
        while ((match = varPattern.exec(line)) !== null) {
          const varName = match[1]
          const startCh = match.index
          const endCh = match.index + match[0].length
          
          // 查找对应的参数信息
          const paramInfo = this.availableParams.find(p => p.name === varName)
          
          // 创建 Widget 元素
          const widgetElement = document.createElement('span')
          widgetElement.className = 'variable-widget'
          widgetElement.style.cssText = `
            background-color: #e8f5e9;
            color: #2e7d32;
            font-weight: bold;
            cursor: pointer;
          `
          widgetElement.textContent = `{{${varName}}}`
          
          // 添加鼠标悬停事件
          widgetElement.addEventListener('mouseover', (event) => {
            this.hoveredParam = paramInfo || { name: varName, description: '未知变量', example: '' }
            this.tooltipPosition = {
              top: event.clientY,
              left: event.clientX
            }
          })
          
          // 添加鼠标离开事件
          widgetElement.addEventListener('mouseout', () => {
            this.hoveredParam = null
            this.tooltipPosition = null
          })
          
          // 使用 replacedWith 选项添加 Widget
          const marker = cm.markText(
            { line: lineIndex, ch: startCh },
            { line: lineIndex, ch: endCh },
            {
              replacedWith: widgetElement,
              handleMouseEvents: true
            }
          )
          
          // 保存标记引用
          this.varMarkers.push(marker)
        }
      })
    },
    
    /**
     * ============================================
     * 删除处理相关方法
     * ============================================
     */
    
    /**
     * 检查光标是否在变量内部
     * 
     * 如果光标在 {{ 和 }} 之间，设置相应的状态
     * 这样删除时就可以整体删除变量
     * 
     * @param {Object} cm - CodeMirror 实例
     * @param {Object} cursor - 光标位置
     */
    checkCursorInVariable(cm, cursor) {
      const line = cm.getLine(cursor.line)
      
      // 匹配 {{xxx}} 的正则表达式
      const varPattern = /\{\{([^}]+)\}\}/g
      let match
      
      while ((match = varPattern.exec(line)) !== null) {
        const startCh = match.index
        const endCh = match.index + match[0].length
        
        // 光标在变量内部（但不在变量末尾）
        if (cursor.ch > startCh && cursor.ch < endCh) {
          this.lastCursorPos = {
            line: cursor.line,
            ch: startCh,
            endCh: endCh
          }
          return
        }
      }
      
      this.lastCursorPos = null
    },
    
    /**
     * 处理删除键
     * 
     * 如果光标在变量内部，按删除键会整体删除整个变量
     * 
     * 逻辑：
     * 1. 检测光标是否在变量内部
     * 2. 如果是，整体删除变量（从 {{ 前到 }} 后）
     * 3. 如果否，正常删除前一个字符
     * 
     * @param {Object} cm - CodeMirror 实例
     * @param {Object} event - 键盘事件
     */
    handleDeleteKey(cm, event) {
      // 如果光标不在变量内部，不做特殊处理
      if (!this.lastCursorPos) {
        return
      }
      
      // 阻止默认删除行为
      event.preventDefault()
      
      // 整体删除变量
      // 从变量开始位置到结束位置
      cm.replaceRange('', 
        { 
          line: this.lastCursorPos.line, 
          ch: this.lastCursorPos.ch - 2  // 包含 {{
        },
        { 
          line: this.lastCursorPos.line, 
          ch: this.lastCursorPos.endCh   // 包含 }}
        }
      )
      
      // 重置状态
      this.lastCursorPos = null
      
      // 刷新标记
      this.$nextTick(() => {
        this.refreshVariableMarkers()
      })
    },
    
    /**
     * ============================================
     * 其他工具方法
     * ============================================
     */
    
    /**
     * 处理外部点击
     * 
     * 当点击编辑器外部时，关闭参数列表
     * 
     * @param {Object} event - 点击事件
     */
    handleOutsideClick(event) {
      // 检查点击是否在编辑器或参数列表内
      const editor = this.$el
      const paramList = this.$el.querySelector('.param-list')
      
      if (editor && !editor.contains(event.target)) {
        this.hideParamList()
      }
    }
  },
  
  watch: {
    /**
     * 监听可用参数变化
     * 当参数列表变化时，重新刷新标记
     */
    availableParams: {
      handler() {
        this.$nextTick(() => {
          this.refreshVariableMarkers()
        })
      },
      deep: true
    }
  }
}
</script>

<style scoped>
/**
 * 动态参数编辑器样式
 * 
 * 主要包含：
 * 1. 编辑器容器样式
 * 2. 参数列表弹窗样式
 * 3. 悬浮提示 dialog 样式
 */

.dynamic-param-editor {
  /* position: relative; */
  height: auto;
}

/* 
 * CodeMirror 容器样式覆盖
 * 确保编辑器正确显示为单行输入框
 */
.dynamic-param-editor >>> .CodeMirror {
  /* 高度设置为单行 */
  height: 36px;
  min-height: 36px;
  max-height: 36px;
  line-height: 34px;
  
  /* 字体设置 */
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  
  /* 边框和圆角 */
  border: 1px solid #ddd;
  border-radius: 4px;
  
  /* 背景色 */
  background: white;
  
  /* 隐藏滚动条 */
  overflow: hidden;
}

/* 单行输入框样式 */
.dynamic-param-editor >>> .CodeMirror-sizer,
.dynamic-param-editor >>> .CodeMirror-lines,
.dynamic-param-editor >>> .CodeMirror-code,
.dynamic-param-editor >>> .CodeMirror-line {
  height: 34px !important;
  min-height: 34px !important;
  max-height: 34px !important;
  line-height: 34px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
}

/* 隐藏行号和折叠区域 */
.dynamic-param-editor >>> .CodeMirror-gutters {
  display: none !important;
}

/* 激活状态的编辑器 */
.dynamic-param-editor >>> .CodeMirror-focused {
  /* 聚焦时边框颜色变化 */
  border-color: #4CAF50;
  outline: none;
}

/**
 * 参数列表弹窗样式
 * 
 * 使用绝对定位显示在光标附近
 * 包含列表头和多个列表项
 */
.param-list {
  position: absolute;
  z-index: 1000;
  
  width: 350px;
  max-height: 200px;
  
  overflow-y: auto;
  
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  list-style: none;
  
  scrollbar-width: thin;
  scrollbar-color: #ddd #f5f5f5;
}

/* 滚动条 Webkit 样式 */
.param-list::-webkit-scrollbar {
  width: 6px;
}

.param-list::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
}

.param-list::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}

/* 参数列表头部 */
.param-list-header {
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #eee;
  font-size: 12px;
  color: #666;
  
  /* 不允许选择 */
  user-select: none;
}

/* 参数列表项 */
.param-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  
  /* 过渡效果 */
  transition: background-color 0.15s;
}

/* 移除最后一项的边框 */
.param-item:last-child {
  border-bottom: none;
}

/* 悬停效果 */
.param-item:hover {
  background-color: #f5f5f5;
}

/* 选中状态 */
.param-item.selected {
  background-color: #4CAF50;
  color: white;
}

/* 选中状态下的描述文字 */
.param-item.selected .param-description {
  color: rgba(255, 255, 255, 0.85);
}

/* 参数名称 - 使用等宽字体 */
.param-name {
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: bold;
  font-size: 13px;
  
  /* 不允许选择 */
  user-select: none;
}

/* 参数描述 */
.param-description {
  font-size: 12px;
  color: #999;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/**
 * 悬浮提示 tooltip 样式
 * 
 * 当鼠标悬浮在变量上时显示
 * 包含变量名称、描述和示例
 */
.param-tooltip {
  position: fixed;
  z-index: 1001;
  pointer-events: none;
  
  width: 250px;
  padding: 12px;
  
  background: rgba(51, 51, 51, 0.95);
  color: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  
  animation: fadeIn 0.15s ease-out;
}

/* 淡入动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* tooltip 内容 */
.tooltip-content {
  font-size: 13px;
  line-height: 1.5;
}

/* tooltip 中的变量名称 */
.tooltip-content strong {
  display: block;
  margin-bottom: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  color: #4CAF50;
}

/* tooltip 描述文字 */
.tooltip-content p {
  margin: 4px 0;
}

/* 示例文字 */
.tooltip-example {
  margin-top: 8px !important;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Consolas', 'Monaco', monospace;
}

/**
 * 响应式调整
 */
@media (max-width: 768px) {
  .param-list {
    width: 280px;
  }
  
  .param-description {
    max-width: 120px;
  }
}
</style>
