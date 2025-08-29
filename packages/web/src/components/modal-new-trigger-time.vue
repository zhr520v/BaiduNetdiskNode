<template>
  <Modal
    :title="`添加${props.triggerType === 'start' ? '启动' : '停止'}时机`"
    size="tiny"
    @ok="onOkThis"
  >
    <div>
      <RadioGroup
        :value="type"
        class="flex-wrap"
        @change="onTypeChange"
      >
        <Radio value="time">
          <div class="flex items-center">
            <div class="w-48">时分</div>
            <Select
              v-model:value="startHour"
              :options="hourOptions"
            ></Select>
            <div class="ml-2 mr-2">:</div>
            <Select
              v-model:value="startMinute"
              :options="minuteOptions"
            ></Select>
          </div>
        </Radio>

        <Radio value="cron">
          <div class="flex items-center">
            <div class="w-48">cron</div>
            <Input
              v-model:value="cronStr"
              :style="{ width: '160px' }"
            />
            <Tooltip
              type="question"
              class="ml-4"
            >
              <div>5位cron表达式, * * * * *</div>
            </Tooltip>
          </div>
        </Radio>
      </RadioGroup>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { isCron } from '@src/common/utils'
import Input from '@src/ui-components/input.vue'
import Message from '@src/ui-components/message'
import Modal from '@src/ui-components/modal.vue'
import RadioGroup from '@src/ui-components/radio-group.vue'
import Radio from '@src/ui-components/radio.vue'
import Select from '@src/ui-components/select.vue'
import Tooltip from '@src/ui-components/tooltip.vue'
import { ref } from 'vue'

interface IProps {
  triggerType: 'start' | 'stop'
  onOk: (triggerType: 'start' | 'stop', timeStr?: string) => void
}

const props = defineProps<IProps>()
const type = ref<'time' | 'cron'>('time')
const startHour = ref('00')
const startMinute = ref('00')
const cronStr = ref('')

const hourOptions = Array(24)
  .fill(0)
  .map((item, index) => {
    const val = index.toString().padStart(2, '0')

    return { label: val, value: val }
  })
const minuteOptions = Array(60)
  .fill(0)
  .map((item, index) => {
    const val = index.toString().padStart(2, '0')

    return { label: val, value: val }
  })

function onTypeChange(value: 'time' | 'cron') {
  type.value = value
}

function onOkThis() {
  if (type.value === 'time') {
    props.onOk?.(props.triggerType, `${startHour.value}:${startMinute.value}`)
  } else if (type.value === 'cron') {
    if (isCron(cronStr.value)) {
      props.onOk?.(props.triggerType, cronStr.value)
    } else {
      Message.error('cron表达式格式错误')
    }
  }
}
</script>
