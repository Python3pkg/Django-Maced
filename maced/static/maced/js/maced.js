// maced_data comes in via django and must be set before including this file

var ADD = "add";
var EDIT = "edit";
var MERGE = "merge";
var DELETE = "delete";
var GET = "get";

var ACTION_TYPES = [ADD, EDIT, MERGE, DELETE, GET];

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

        // Add click events for all buttons to remove success divs
        for (var action_type in ACTION_TYPES)
        {
            $("#" + ACTION_TYPES[action_type] + "-" + item_name + "-button").click({item_name: item_name}, function(event)
            {
                remove_success_divs(event.data.item_name);
            });
        }

        // Add click events for all selects to remove success divs
        item_select.click({item_name: item_name}, function(event)
        {
            remove_success_divs(event.data.item_name);
        });

        // Add change events for all selects to cause data loads
        item_select.change({item_name: item_name}, function(event)
        {
            // Get the data
            get_item(event.data.item_name);
        });

        // Add change event for merge modal right select. Using "input" because it was copied and I'm too lazy to fix right now. :)
        $("#merge-" + item_name + "2-input").change({item_name: item_name}, function(event)
        {
            get_item2_for_merge(event.data.item_name);
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
    var merge_item1_select = $("#" + MERGE + "-" + item_name + "1-input");
    var merge_item2_select = $("#" + MERGE + "-" + item_name + "2-input");
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
            merge_item1_select.append($("<option selected></option>").attr("value", id).text(name));
            merge_item2_select.append($("<option></option>").attr("value", id).text(name));  // Select 2 doesn't need to have its selection overridden

            // Reset the modal for the next item addition
            for (i = 0; i < field_names[item_name].length; i++)
            {
                field_name = field_names[item_name][i];
                set_input_item(action_type, item_name, field_name, "", null);
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
    var merge_item1_select = $("#" + MERGE + "-" + item_name + "1-input");
    var merge_item2_select = $("#" + MERGE + "-" + item_name + "2-input");
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
            item_select.find(":selected").text(name);  // Using selected because it is probably faster
            merge_item1_select.find("option[value=" + item_id + "]").text(name);  // Not using select for these since it can't be guaranteed that is the selected one
            merge_item2_select.find("option[value=" + item_id + "]").text(name);  // Not using select for these since it can't be guaranteed that is the selected one

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
    var item_select = $("#" + item_name + "-select");
    var merge_item1_select = $("#" + MERGE + "-" + item_name + "1-input");
    var merge_item2_select = $("#" + MERGE + "-" + item_name + "2-input");
    var data = {};
    var item1_id = merge_item1_select.val();
    var item2_id = merge_item2_select.val();
    var url = base_url + item1_id + "/" + item2_id + "/";
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

            // For the following finds, which option is used to remove and which is used to set to doesn't matter

            // Remove the old option
            item_select.find("option[value=" + item2_id + "]").remove();
            merge_item1_select.find("option[value=" + item2_id + "]").remove();
            merge_item2_select.find("option[value=" + item2_id + "]").remove();

            // Turn the other option into the new merged option and select it
            item_select.find("option[value=" + item1_id + "]").attr("value", id).prop("selected", true).text(name);
            merge_item1_select.find("option[value=" + item1_id + "]").attr("value", id).prop("selected", true).text(name);
            merge_item2_select.find("option[value=" + item1_id + "]").attr("value", id).prop("selected", true).text(name);

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

function delete_item(item_name, base_url)
{
    var action_type = DELETE;
    var modal = $("#" + action_type + "-" + item_name + "-modal");
    var spinner = $("#" + action_type + "-" + item_name + "-spinner");
    var error_div = $("#" + action_type + "-" + item_name + "-error-div");
    var item_select = $("#" + item_name + "-select");
    var merge_item1_select = $("#" + MERGE + "-" + item_name + "1-input");
    var merge_item2_select = $("#" + MERGE + "-" + item_name + "2-input");
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
            item_select.find(":selected").remove();  // Using selected because it is probably faster
            merge_item1_select.find("option[value=" + item_id + "]").remove();  // Not using select for these since it can't be guaranteed that is the selected one
            merge_item2_select.find("option[value=" + item_id + "]").remove();  // Not using select for these since it can't be guaranteed that is the selected one

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
    var merge_confirmation_button = $("#" + MERGE + "-" + item_name + "-confirmation-button");
    var merge_declination_button = $("#" + MERGE + "-" + item_name + "-declination-button");
    var item_select = $("#" + item_name + "-select");
    var item_id = item_select.val();
    var url = get_urls[item_name] + item_id + "/";
    var field_name;
    var i;

    // Disable actions while we are getting data
    edit_button.prop("disabled", true);
    merge_button.prop("disabled", true);
    delete_button.prop("disabled", true);
    merge_confirmation_button.prop("disabled", true);
    merge_declination_button.prop("disabled", true);

    // Fill the hidden value with the new value. This is what is sent to the backend on post.
    item_hidden.val(item_select.val());

    // Fill the modals with appropriate content
    if (item_id == "" || typeof item_id === typeof undefined || item_id === null)
    {
        for (i = 0; i < field_names[item_name].length; i++)
        {
            field_name = field_names[item_name][i];

            // Empty all the modals out for this item
            set_input_item(EDIT, item_name, field_name, "", null);
            set_input_item(MERGE, item_name, field_name, "", 1);
            set_input_item(MERGE, item_name, field_name, "", 2);
            set_input_item(DELETE, item_name, field_name, "", null);
        }

        return;
    }

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
            var merge_select1 = $("#" + MERGE + "-" + item_name + "1-input");
            var merge_select2 = $("#" + MERGE + "-" + item_name + "2-input");

            // Re-enable the declination button
            merge_declination_button.prop("disabled", false);

            // 1 is for the merge modal left select. Setting it to the new id
            merge_select1.find("option[value=" + item_id + "]").attr("selected", true);

            // Fill the modals with appropriate content
            for (i = 0; i < field_names[item_name].length; i++)
            {
                field_name = field_names[item_name][i];
                set_input_item(EDIT, item_name, field_name, fields[field_name], null);
                set_input_item(MERGE, item_name, field_name, fields[field_name], 1);  // Fill in the left panel
                set_input_item(MERGE, item_name, field_name, "", 2);  // But empty the right panel
                set_input_item(DELETE, item_name, field_name, fields[field_name], null);
            }

            // Enable the buttons
            edit_button.prop("disabled", false);
            delete_button.prop("disabled", false);

            if (merge_select1.find("option").size() > 1)
            {
                merge_button.prop("disabled", false);
            }


            // If both selects have the same thing in them, aka trying to merge with itself.
            if (merge_select1.val() == merge_select2.val())
            {
                merge_confirmation_button.prop("disabled", true);
            }
            else
            {
                merge_confirmation_button.prop("disabled", false);
            }
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
        }
    });
}

// Special get action function for item2 on the merge modal
function get_item2_for_merge(item_name)
{
    var action_type = GET;
    var merge_button = $("#" + MERGE + "-" + item_name + "-button");
    var merge_spinner = $("#" + MERGE + "-" + item_name + "-spinner");
    var merge_error_div = $("#" + MERGE + "-" + item_name + "-error-div");
    var merge_confirmation_button = $("#" + MERGE + "-" + item_name + "-confirmation-button");
    var merge_declination_button = $("#" + MERGE + "-" + item_name + "-declination-button");
    var item_select = $("#" + MERGE + "-" + item_name + "2-input");  // 2 is for the right select. The left has already been filled.
    var item_id = item_select.val();
    var url = get_urls[item_name] + item_id + "/";
    var field_name;
    var i;

    // Disable the confirmation and declination buttons. Need to create this logic.
    merge_confirmation_button.prop("disabled", true);
    merge_declination_button.prop("disabled", true);
    //merge_button.prop("disabled", true);

    // Fill the merge modal's right panel with with appropriate content
    if (item_id == "" || typeof item_id === typeof undefined)
    {
        for (i = 0; i < field_names[item_name].length; i++)
        {
            field_name = field_names[item_name][i];

            // Empty the merge modal's right panel for this item
            set_input_item(MERGE, item_name, field_name, "", 2);
        }

        return;
    }

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
            var merge_select1 = $("#" + MERGE + "-" + item_name + "1-input");
            var merge_select2 = $("#" + MERGE + "-" + item_name + "2-input");

            // Re-enable the declination button
            merge_declination_button.prop("disabled", false);

            // Fill the modals with appropriate content
            for (i = 0; i < field_names[item_name].length; i++)
            {
                field_name = field_names[item_name][i];
                set_input_item(MERGE, item_name, field_name, fields[field_name], 2);  // Fill in the right panel
            }

            // If both selects have the same thing in them, aka trying to merge with itself.
            if (merge_select1.val() == merge_select2.val())
            {
                merge_confirmation_button.prop("disabled", true);
            }
            else
            {
                merge_confirmation_button.prop("disabled", false);
            }
        },

        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            merge_spinner.css("display", "none");
            merge_error_div.text(XMLHttpRequest.responseText);
            merge_error_div.css("display", "");
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

// Get value from an input for the related item
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

// Set value of an input for the related item
function set_input_item(action_type, item_name, field_name, value, merge_panel_number)
{
    var input;

    if (action_type == MERGE)
    {
        input = $("#" + action_type + "-" + item_name + merge_panel_number + "-" + field_name + "-input");
    }
    else
    {
        input = $("#" + action_type + "-" + item_name + "-" + field_name + "-input");
    }

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