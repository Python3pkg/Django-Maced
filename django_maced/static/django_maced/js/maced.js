// maced_data comes in via django and must be set before including this file

var ADD = "add";
var EDIT = "edit";
var MERGE = "merge";
var DELETE = "delete";
var GET = "get";

var item_names = maced_data["item_names"];
var field_names = JSON.parse(maced_data["field_names"]);
var get_urls = JSON.parse(maced_data["get_urls"]);
var login_url = JSON.parse(maced_data["login_url"]);

$(document).ready(function()
{
    var i;
    var item_select;
    var item_name;

    // Loop through all items and add "click" and "change" events and load any initial data if any exists.
    for (i = 0; i < item_names.length; i++)
    {
        item_name = item_names[i];
        item_select = $("#" + item_name + "-select");
        get_item(item_name);

        $("#" + item_name + "-hidden").val(item_select.val());

        $("#" + ADD + "-" + item_name + "-button").click({item_name: item_name}, function(event)
        {
            remove_success_divs(event.data.item_name);
        });

        $("#" + EDIT + "-" + item_name + "-button").click({item_name: item_name}, function(event)
        {
            remove_success_divs(event.data.item_name);
        });

        $("#" + MERGE + "-" + item_name + "-button").click({item_name: item_name}, function(event)
        {
            remove_success_divs(event.data.item_name);
        });

        $("#" + DELETE + "-" + item_name + "-button").click({item_name: item_name}, function(event)
        {
            remove_success_divs(event.data.item_name);
        });

        item_select.change({item_name: item_name, item_select: item_select}, function(event)
        {
            $("#" + EDIT + "-" + event.data.item_name + "-button").prop("disabled", true);
            $("#" + MERGE + "-" + event.data.item_name + "-button").prop("disabled", true);
            $("#" + DELETE + "-" + event.data.item_name + "-button").prop("disabled", true);

            if ($(this).val() == "")
            {
                $("#" + event.data.item_name + "-hidden").val("");
            }
            else
            {
                get_item(event.data.item_name);
            }

            $("#" + event.data.item_name).val(event.data.item_select.val());
        });

        item_select.click({item_name: item_name}, function(event)
        {
            remove_success_divs(event.data.item_name);
        });
    }
});

function add_item(item_name, url)
{
    var action_type = ADD;
    var modal = $("#" + action_type + "-" + item_name + "-modal");
    var spinner = $("#" + action_type + "-" + item_name + "-spinner");
    var error_div = $("#" + action_type + "-" + item_name + "-error-div");
    var item_select = $("#" + item_name + "-select");
    var data = {};
    var field_name;
    var i;

    for (i = 0; i < field_names[item_name].length; i++)
    {
        field_name = field_names[item_name][i];
        data[field_name] = get_input_item(action_type, item_name, field_name);
    }

    spinner.css("display", "");
    error_div.css("display", "none");

    $.ajax(
    {
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
            var authenticated = out_data_json["authenticated"];

            if (!authenticate(authenticated, action_type))
            {
                return;
            }

            var id = out_data_json["id"];
            var name = out_data_json["name"];

            spinner.css("display", "none");
            modal.modal("hide");
            $("#" + action_type + "-" + item_name + "-success-div").css("display", "");

            // Add the new option to the select and select it
            item_select.append($("<option selected></option>").attr("value", id).text(name));

            // Reset the modal for the next item addition
            for (i = 0; i < field_names[item_name].length; i++)
            {
                field_name = field_names[item_name][i];
                set_input_item(action_type, item_name, field_name, "");
            }

            // Fill edit, merge, and delete with this new data
            get_item(item_name);
        },

        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            spinner.css("display", "none");
            error_div.text(XMLHttpRequest.responseText);
            error_div.css("display", "");
        }
    });
}

function edit_item(item_name, base_url)
{
    var action_type = EDIT;
    var modal = $("#" + action_type + "-" + item_name + "-modal");
    var spinner = $("#" + action_type + "-" + item_name + "-spinner");
    var error_div = $("#" + action_type + "-" + item_name + "-error-div");
    var item_select = $("#" + item_name + "-select");
    var data = {};
    var item_id = item_select.val();
    var url = base_url + item_id + "/";
    var field_name;
    var i;

    for (i = 0; i < field_names[item_name].length; i++)
    {
        field_name = field_names[item_name][i];
        data[field_name] = get_input_item(action_type, item_name, field_name);
    }

    spinner.css("display", "");
    error_div.css("display", "none");

    $.ajax(
    {
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
            var authenticated = out_data_json["authenticated"];

            if (!authenticate(authenticated, action_type))
            {
                return;
            }

            var name = out_data_json["name"];

            spinner.css("display", "none");
            modal.modal("hide");
            $("#" + action_type + "-" + item_name + "-success-div").css("display", "");

            // Update the option with the new name (could be the same name though)
            item_select.find(":selected").attr("value", item_id).text(name);

            // Fill edit, merge, and delete with this new data
            get_item(item_name);
        },

        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            spinner.css("display", "none");
            error_div.text(XMLHttpRequest.responseText);
            error_div.css("display", "");
        }
    });
}

function merge_item(item_name, base_url)
{
    var action_type = MERGE;
    var modal = $("#" + action_type + "-" + item_name + "-modal");
    var spinner = $("#" + action_type + "-" + item_name + "-spinner");
    var error_div = $("#" + action_type + "-" + item_name + "-error-div");
    var item1_select = $("#" + item_name + "-select");
    //var item2_select = $("#" + item_name + "-select");
    var data = {};
    var item1_id = item1_select.val();
    //var item2_id = item2_select.val();
    var url = base_url + item1_id + "/" + 1 + "/";
    var field_name;
    var i;

    for (i = 0; i < field_names[item_name].length; i++)
    {
        field_name = field_names[item_name][i];
        data[field_name] = get_input_item(action_type, item_name, field_name);
    }

    spinner.css("display", "");
    error_div.css("display", "none");

    $.ajax(
    {
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
            var authenticated = out_data_json["authenticated"];

            if (!authenticate(authenticated, action_type))
            {
                return;
            }

            var name = out_data_json["name"];
            var id = out_data_json["id"];

            spinner.css("display", "none");
            modal.modal("hide");
            $("#" + action_type + "-" + item_name + "-success-div").css("display", "");

            // Add the new option to the select and select it
            item1_select.find(":selected").attr("value", id).text(name);

            //// Fill edit, merge, and delete with this new data
            get_item(item_name);
        },

        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            spinner.css("display", "none");
            error_div.text(XMLHttpRequest.responseText);
            error_div.css("display", "");
        }
    });
}

function delete_item(item_name, base_url)
{
    var action_type = DELETE;
    var modal = $("#" + action_type + "-" + item_name + "-modal");
    var spinner = $("#" + action_type + "-" + item_name + "-spinner");
    var error_div = $("#" + action_type + "-" + item_name + "-error-div");
    var item_select = $("#" + item_name + "-select");
    var item_id = item_select.val();
    var url = base_url + item_id + "/";

    $.ajax(
    {
        type: "GET",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
            var authenticated = out_data_json["authenticated"];

            if (!authenticate(authenticated, action_type))
            {
                return;
            }

            spinner.css("display", "none");
            modal.modal("hide");
            $("#" + action_type + "-" + item_name + "-success-div").css("display", "");

            // Remove the option from the select
            item_select.find("option[value=" + item_id + "]").remove();

            // Fill edit, merge, and delete with this with data from whatever is the new selection
            get_item(item_name);
        },

        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            spinner.css("display", "none");
            error_div.text(XMLHttpRequest.responseText);
            error_div.css("display", "");
        }
    });
}

function get_item(item_name)
{
    var action_type = GET;
    var item_hidden = $("#" + item_name + "-hidden");
    var edit_button = $("#" + EDIT + "-" + item_name + "-button");
    var edit_spinner = $("#" + EDIT + "-" + item_name + "-spinner");
    var edit_error_div = $("#" + EDIT + "-" + item_name + "-error-div");
    var merge_button = $("#" + MERGE + "-" + item_name + "-button");
    var merge_spinner = $("#" + MERGE + "-" + item_name + "-spinner");
    var merge_error_div = $("#" + MERGE + "-" + item_name + "-error-div");
    var delete_button = $("#" + DELETE + "-" + item_name + "-button");
    var delete_spinner = $("#" + DELETE + "-" + item_name + "-spinner");
    var delete_error_div = $("#" + DELETE + "-" + item_name + "-error-div");
    var item_select = $("#" + item_name + "-select");
    var item_id = item_select.val();
    var url = get_urls[item_name] + item_id + "/";
    var field_name;
    var i;

    item_hidden.val(item_select.val());

    // Fill the modals with appropriate content
    if (item_id == "" || typeof item_id === typeof undefined)
    {
        for (i = 0; i < field_names[item_name].length; i++)
        {
            field_name = field_names[item_name][i];
            set_input_item(EDIT, item_name, field_name, "");
            set_input_item(MERGE, item_name, field_name, "");
            set_input_item(DELETE, item_name, field_name, "");
        }

        edit_button.prop("disabled", false);
        merge_button.prop("disabled", true);
        delete_button.prop("disabled", true);

        return;
    }
    else
    {
        edit_button.prop("disabled", false);
        merge_button.prop("disabled", false);
        delete_button.prop("disabled", false);
    }

    //add_spinner();

    $.ajax(
    {
        type: "GET",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
            var authenticated = out_data_json["authenticated"];

            if (!authenticate(authenticated, action_type))
            {
                return;
            }

            var fields = out_data_json["fields"];
            var field_name;
            var i;

            // Fill the modals with appropriate content
            for (i = 0; i < field_names[item_name].length; i++)
            {
                field_name = field_names[item_name][i];
                set_input_item(EDIT, item_name, field_name, fields[field_name]);
                set_input_item(MERGE, item_name, field_name, fields[field_name]);
                set_input_item(DELETE, item_name, field_name, fields[field_name]);
            }

            //remove_spinner();
        },

        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            edit_spinner.css("display", "none");
            edit_error_div.text(XMLHttpRequest.responseText);
            edit_error_div.css("display", "");

            merge_spinner.css("display", "none");
            merge_error_div.text(XMLHttpRequest.responseText);
            merge_error_div.css("display", "");

            delete_spinner.css("display", "none");
            delete_error_div.text(XMLHttpRequest.responseText);
            delete_error_div.css("display", "");

            //remove_spinner();
        }
    });
}

function authenticate(authenticated, type)
{
    if (!authenticated && type != GET)
    {
        alert("Please login to add/edit/merge/delete items.");

        if (!(login_url === null))
        {
            window.location.href = login_url;
        }

        return false;
    }

    return true;
}

function remove_success_divs(item_name)
{
    $("#" + ADD + "-" + item_name + "-success-div").css("display", "none");
    $("#" + EDIT + "-" + item_name + "-success-div").css("display", "none");
    $("#" + MERGE + "-" + item_name + "-success-div").css("display", "none");
    $("#" + DELETE + "-" + item_name + "-success-div").css("display", "none");
}

function get_input_item(action_type, item_name, field_name)
{
    var input = $("#" + action_type + "-" + item_name + "-" + field_name + "-input");

    if (input.is("input:text"))
    {
        return input.val();
    }
    else if (input.attr("type") == "color")
    {
        return input.val();
    }
    else if (input.is("select"))
    {
        return input.val();
    }
    else
    {
        alert("Input type not implemented for get_input_item()");
    }
}

function set_input_item(action_type, item_name, field_name, value)
{
    var input = $("#" + action_type + "-" + item_name + "-" + field_name + "-input");

    if (input.is("input:text"))
    {
        input.val(value);
    }
    else if (input.attr("type") == "color")
    {
        input.val(value);
    }
    else if (input.is("select"))
    {
        if (action_type != ADD)
        {
            input.val(value);
        }
    }
    else
    {
        alert("Ensure that you have added \"" + item_name + "\" to the page");
        alert("Input type not implemented for set_input_item()");
    }
}

function change_item_visibility(item_name, should_turn_on)
{
    var item_tr = $("#" + item_name + "-tr");

    if (should_turn_on)
    {
        item_tr.css("display", "");
    }
    else
    {
        item_tr.css("display", "none");
    }
}