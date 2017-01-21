/**
 * Created by Administrator on 2017/1/14.
 */
$(function () {
    var date = new lCalendar();
    date.init({
        'trigger': '#date',
        'type': 'date'
    });

    var time = new lCalendar();
    time.init({
        'trigger': '#time',
        'type': 'time'
    });
});