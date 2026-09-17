---
title: 代码分层以及代码可读性
date: 2026-08-18
category: 入门/框架
tags: [分层, 框架, 可移植]
slug: code-layering
excerpt: 从 APP / modules / bsp / HAL 四层讲起，说清楚依赖方向为什么要单向向下，以及 APP 层为什么应该是一串函数调用。
---

## 一、代码分层

**分层的作用：** 上层只管"要做什么"，下层只管"怎么做"，每一层只允许向下依赖，不允许反过来。

一般框架从上到下是四层：

```
application（APP 层）   最上层     ← 业务逻辑：机器人该干什么
modules（模块层）      中间层     ← 板载器件驱动：电机、IMU、遥控器
bsp（板级支持层）      最底层     ← 芯片片上外设：CAN、USART、SPI、GPIO
HAL / Drivers（CubeMX 生成）      ← 官方库，一般不动
```

`bsp` 封装的是"芯片自带的片上外设"——CAN、串口、SPI、GPIO、ADC、PWM 这些 MCU 内部的东西。bsp 层的功能是提供对片上外设调用的 API 接口。

举个具体例子：

- `bsp/can/bsp_can.c` —— 这是"芯片的 CAN 外设怎么收发报文"，属于 bsp 层。
- `modules/motor/DJImotor/dji_motor.c` —— 这是"大疆电机怎么用 CAN 收发来解码反馈、发电流指令"，属于 modules 层。
- 电机驱动是调用 `bsp_can` 去收发报文的，所以 modules 依赖 bsp，modules 在上面。

> 注："modules" 也可以叫 "device" 层（APP → Controller → device → BSP → HAL），本质一模一样。

```
void GPIOToggel(GPIOInstance *_instance)
{
    HAL_GPIO_TogglePin(_instance->GPIOx, _instance->GPIO_Pin);
}

void GPIOSet(GPIOInstance *_instance)
{
    HAL_GPIO_WritePin(_instance->GPIOx, _instance->GPIO_Pin, GPIO_PIN_SET);
}

void GPIOReset(GPIOInstance *_instance)
{
    HAL_GPIO_WritePin(_instance->GPIOx, _instance->GPIO_Pin, GPIO_PIN_RESET);
}

GPIO_PinState GPIORead(GPIOInstance *_instance)
{
    return HAL_GPIO_ReadPin(_instance->GPIOx, _instance->GPIO_Pin);
}
```

bsp 层本质是对 HAL 库的重新封装。如果从头编写框架，可以先让 AI 列出各个模块的一些基本功能，之后再来完成对 bsp 层的编写。

## 二、依赖方向必须"单向向下"

APP 可以调用 modules，modules 可以调用 bsp，bsp 可以调用 HAL；但 bsp 绝对不知道 modules 和 APP 的存在。

> 一旦出现"底层反过来调用上层"，分层就塌了。这也是为什么框架反复强调：应用之间、层与层之间，不要用全局变量串来串去——那会让所有层互相纠缠，等于没分层。

更重要的是，这点直接决定了代码的**可移植性**。一套代码，达妙板能用，换到 C 板，只需修改 bsp 层对 HAL 库函数的封装。不同的芯片，HAL 库对一些函数的命名不同（如 UART、USART 等）。如果出现越级——上层直接对 HAL 库函数进行调用——就会增加移植时的工程量。

比较明显的就是：

```
APP 层 include 的都是 modules 层的文件
modules 层的文件 include 的都是 bsp 层的文件
——所以才说"只用修改 bsp 层的文件"
```

## 三、APP 层是"一串函数调用"

**APP 层应该是"编排"，不是"实现"。**

好代码的 APP 层，读起来应该像一份任务清单，每个 Task 函数只有几行、十几行，全部是函数调用：

```
void GetRefTask(void const * argument)
{
  for(;;)
  {
    // 遥控器状态获取
    switch (SBUS_GetLinkState(sbus)) {
    case SBUS_LINK_OK:        // 收到有效控制帧，更新摇杆、拨轮和开关量
        SBUS_Channels2Switch(sbus);
        break;
    case SBUS_LINK_FS:        // 接收机仍有数据，但已置位 failsafe 或连续无有效控制帧
        SBUS_SetSafeState(sbus);
        break;
    case SBUS_LINK_DOWN:      // 从未收到完整帧或超过 500ms 未收到完整帧
    default:
        SBUS_SetSafeState(sbus);
        break;
    }
    osDelay(10);
  }
}
```

读者一眼就知道这个任务"干了哪几件事"，每一件事的实现细节在对应的小函数里。函数实现不能全塞在 Task 里，哪里出现问题，跳转到哪里就行。"跳转到哪里" = "每个功能都有一个专属的、命名清晰的小函数"。

> 如果所有逻辑都糊在一个大 Task 里，你就没法"跳转"，只能从头到尾一行行硬读——这就是"可读性差"和"可维护性差"的根源。

### 有限状态机（FSM）

有限状态机是一种把系统抽象成「有限个状态 + 状态之间的转移」的编程方式。标准写法是「枚举 + switch + 一个状态变量 + 每个状态一个函数」：

```
switch (context->state) {                 // 状态变量记录"当前在哪"
case MOTOR_CTRL_STATE_HOMING:             // 每个状态一个 case
    MotorCtrlProcessHoming(context, now); // 每个状态一个处理函数
    break;
case MOTOR_CTRL_STATE_SPEED_RUN:
    MotorCtrlProcessSpeedRun(context, now);
    break;
...
}
```

如果不用状态机，复杂流程会变成一团嵌套的 if-else，读者分不清"程序当前走到哪一步了"。
