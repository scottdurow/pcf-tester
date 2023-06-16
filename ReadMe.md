# PCF  Tester  Controls

The purpose of these sets of controls is to enable testing of specific scenarios to determine how the Power Apps Component Framework responds to inputs and events.

The monitoring behaviour is controlled via the `mode` command. Using mode allows the control to be placed into one or more monitoring modes. Multiple modes can be combined using a comma separated list.

The following modes are supported:

- `clearevents` - Clears any previous logged events. This is useful if you want to clear the log before additional information is logged in a specific `updateView`.
- `error` - Simulates an error happening during the `updateView`
- `data` - Outputs the dataset data received
- `columns` - Outputs the columns configured in the dataset
- `hidden_columns` - Outputs the hidden columns with hidden=true or order=-1
- `dataset` - Logs information about the dataset including loading, error state and paging
- `size` - Shows the width/height received by the control
- `updates` - Shows the `updatedProperties` array value
- `state` - Outputs the control state

When an event is logged, it is categories as:

-  init: 🟢
- updateView: 🔶
- Manual Command: 🚀
- getOutputs: 🔼
- destroy: Not reported

The Event is also followed by a counter value. So if there are 2 calls to updateView so far in the lifecycle, then it will show as 🔶 2

## Commands

The following commands can be used:

- `mode [mode list]` - Sets one or modes (comma separated). Chain them in a specific order - e.g. `clearevents,columns,dataset`

- `event` - Updates the `Output 2` property with a random value and raises the `OnAction` event

- `eventnotify` - Updates the `Output 2` property the same as the `event` command, raises the `OnAction` , except also calls `notifyOutputChanged`

- `setselection` - Set the selected records to the first dataset row

- `set [property] [value]` - Sets a property value - e.g. `set bound_1 foo`

- `clearproperty [property]` - Removes a property value - e.g. `clearproperty bound_1`

- `setstate [key] [value]` - Sets a control status value - e.g. `setstate foo bar`

- `clearstate` - Clears all the state values

- `pagesize [records]` - Sets the page set for the dataset - e.g. `pagesize 50`

- `report` - Simulates an `updateView` call and reports based on the mode

- `notify` - called `notifyOutputChanged`

- `notify_n [count] [interval]`-  Calls `notifyOutputChanged` a specific set of times at a given interval - e.g. `notify 10 1000` will call `notifyOutputChanged` 10 times at an interval of 1000ms

- `cls` - Clears all log events

- `refresh` - Refreshes the dataset

- `loadnextpage` - Calls `loadnextpage`

- `loadpreviouspage` - Calls `loadpreviouspage`

- `loadexactpage [page]` - Call `loadexactpage` for a specific page

  