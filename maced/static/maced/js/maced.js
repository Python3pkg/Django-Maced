// maced_data comes in via django and must be set before including this file

var maced_MERGE = "merge";
var maced_ADD = "add";
var maced_CLONE = "clone";
var maced_EDIT = "edit";
var maced_DELETE = "delete";
var maced_GET = "get";
var maced_INFO = "info";
var maced_AUTHENTICATE = "authenticate";

var maced_ACTION_TYPES = [maced_ADD, maced_EDIT, maced_MERGE, maced_DELETE, maced_GET];

var maced_item_names = maced_data["item_names"];
var maced_field_names = JSON.parse(maced_data["field_names"]);
var maced_field_identifiers = JSON.parse(maced_data["field_identifiers"]);
var maced_item_names_with_ignored_alerts = JSON.parse(maced_data["item_names_with_ignored_alerts"]);
var maced_urls = JSON.parse(maced_data["urls"]);
var maced_login_url = JSON.parse(maced_data["login_url"]);

$(document).ready(function()
{
    var i;
    var item_select;
    var item_name;
    var modals = $(".modal");

    // Set all readonly input fields within maced to deny backspace as a page-back mechanism.
    // Refer to http://stackoverflow.com/questions/8876928/allow-copy-paste-in-a-disabled-input-text-box-in-firefox-browsers
    $(".maced[readonly]").each(function()
    {
        $(this).keydown(function(event)
        {
            var key = event.which || event.keyCode || 0;

            if(key === 8)
            {
                event.preventDefault();
            }
        });
    });

    modals.on("show.bs.modal", function(event)
    {
        var index = $(".modal:visible").length;

        $(this).css("z-index", 1040 + (10 * index));
    });

    modals.on("shown.bs.modal", function(event)
    {
        var index = ($(".modal:visible").length) -1; // raise backdrop after animation.
        var modal_backdrops = $(".modal-backdrop");

        modal_backdrops.not(".maced-stacked").css("z-index", 1039 + (10 * index));
        modal_backdrops.not(".maced-stacked").addClass("maced-stacked");
    });

    // Loop through all items and add "click" and "change" events and load any initial data if any exists.
    for (i = 0; i < maced_item_names.length; i++)
    {
        item_name = maced_item_names[i];

        // Add click events for all buttons to remove success divs
        // Run authentication to set initial button states.
        for (var action_type in maced_ACTION_TYPES)
        {
            $("#" + maced_ACTION_TYPES[action_type] + "-" + item_name + "-button").click({item_name: item_name}, function(event)
            {
                remove_success_divs(event.data.item_name);
            });

            get_authentication(item_name, action_type);
        }

        // Get the info for the pre-selected item. If none, then skip.
        item_select = $("#" + item_name + "-select");
        get_item(item_name);

        // Set the value that will be sent to the backend as the current item's value. If None, then None.
        $("#" + item_name + "-hidden").val(item_select.val());

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

    // This is a callback function to signal that maced is all done on the page. This is provided by you in order to
    // allow specialized code that doesn't start until maced is done. For instance, if you would like to show a spinner
    // while maced is loading, you can do so by using this function to shut it off. If this function is missing, it
    // will not fire.
    if ($.isFunction("maced_is_loaded"))
    {
        maced_is_loaded();
    }
});

function merge_item(item_name)
{
    var action_type = maced_MERGE;
    var modal = $("#" + action_type + "-" + item_name + "-modal");
    var spinner = $("#" + action_type + "-" + item_name + "-spinner");
    var error_div = $("#" + action_type + "-" + item_name + "-error-div");
    var item_select = $("#" + item_name + "-select");
    var merge_item1_select = $("#" + maced_MERGE + "-" + item_name + "1-input");
    var merge_item2_select = $("#" + maced_MERGE + "-" + item_name + "2-input");
    var data = {};
    var item1_id = merge_item1_select.val();
    var item2_id = merge_item2_select.val();
    var url = maced_urls[item_name];
    var field_name;
    var field_identifier;
    var i;

    if (item1_id == "" || typeof item1_id === typeof undefined || item1_id === null)
    {
        return;
    }

    if (item2_id == "" || typeof item2_id === typeof undefined || item2_id === null)
    {
        return;
    }

    disable_buttons(item_name);

    for (i = 0; i < maced_field_names[item_name].length; i++)
    {
        field_name = maced_field_names[item_name][i];
        field_identifier = maced_field_identifiers[item_name][i];
        data[field_name] = get_input_item(action_type, item_name, field_identifier);
    }

    data["action_type"] = action_type;
    data["item_id"] = item1_id;
    data["item2_id"] = item2_id;

    $.ajax(
    {
        async: false,
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
            var name = out_data_json["name"];
            var id = out_data_json["id"];

            spinner.css("display", "none");
            modal.modal("hide");
            $("#" + action_type + "-" + item_name + "-success-div").css("display", "");

            // For the following "finds", which option is used to remove and which is used to set to doesn't matter

            // Remove the old option
            item_select.find("option[value=" + item2_id + "]").remove();
            merge_item1_select.find("option[value=" + item2_id + "]").remove();
            merge_item2_select.find("option[value=" + item2_id + "]").remove();

            // Turn the other option into the new merged option and select it
            item_select.find("option[value=" + item1_id + "]").attr("value", id).prop("selected", true).text(name);
            merge_item1_select.find("option[value=" + item1_id + "]").attr("value", id).prop("selected", true).text(name);
            merge_item2_select.find("option[value=" + item1_id + "]").attr("value", id).prop("selected", true).text(name);

            // Fill modals with this new data
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

function add_item(item_name)
{
    var action_type = maced_ADD;
    var modal = $("#" + action_type + "-" + item_name + "-modal");
    var spinner = $("#" + action_type + "-" + item_name + "-spinner");
    var error_div = $("#" + action_type + "-" + item_name + "-error-div");
    var item_select = $("#" + item_name + "-select");
    var merge_item1_select = $("#" + maced_MERGE + "-" + item_name + "1-input");
    var merge_item2_select = $("#" + maced_MERGE + "-" + item_name + "2-input");
    var data = {};
    var url = maced_urls[item_name];
    var field_name;
    var field_identifier;
    var i;

    for (i = 0; i < maced_field_names[item_name].length; i++)
    {
        field_name = maced_field_names[item_name][i];
        field_identifier = maced_field_identifiers[item_name][i];
        data[field_name] = get_input_item(action_type, item_name, field_identifier);
    }

    data["action_type"] = action_type;

    $.ajax(
    {
        async: false,
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
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
            for (i = 0; i < maced_field_names[item_name].length; i++)
            {
                field_identifier = maced_field_identifiers[item_name][i];
                set_input_item(action_type, item_name, field_identifier, "", null);
            }

            // Fill modals with this new data
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

function clone_item(item_name)
{
    //var action_type = maced_CLONE;
    //var modal = $("#" + action_type + "-" + item_name + "-modal");
    //var spinner = $("#" + action_type + "-" + item_name + "-spinner");
    //var error_div = $("#" + action_type + "-" + item_name + "-error-div");
    //var item_select = $("#" + item_name + "-select");
    //var merge_item1_select = $("#" + maced_MERGE + "-" + item_name + "1-input");
    //var merge_item2_select = $("#" + maced_MERGE + "-" + item_name + "2-input");
    //var data = {};
    //var item_id = item_select.val();
    //var url = maced_urls[item_name];
    //var field_name;
    //var field_identifier;
    //var i;
    //
    //if (item_id == "" || typeof item_id === typeof undefined || item_id === null)
    //{
    //    return;
    //}
    //
    //disable_buttons(item_name);
    //
    //for (i = 0; i < maced_field_names[item_name].length; i++)
    //{
    //    field_name = maced_field_names[item_name][i];
    //    field_identifier = maced_field_identifiers[item_name][i];
    //    data[field_name] = get_input_item(action_type, item_name, field_identifier);
    //}
    //
    //data["action_type"] = action_type;
    //data["item_id"] = item_id;
    //
    //$.ajax(
    //{
    //    async: false,
    //    data: data,
    //    type: "POST",
    //    url: url,
    //
    //    success: function(out_data)
    //    {
    //        var out_data_json = JSON.parse(out_data);
    //        var id = out_data_json["id"];
    //        var name = out_data_json["name"];
    //
    //        spinner.css("display", "none");
    //        modal.modal("hide");
    //        $("#" + action_type + "-" + item_name + "-success-div").css("display", "");
    //
    //        // Add the new option to the select and select it
    //        item_select.append($("<option selected></option>").attr("value", id).text(name));
    //        merge_item1_select.append($("<option selected></option>").attr("value", id).text(name));
    //        merge_item2_select.append($("<option></option>").attr("value", id).text(name));  // Select 2 doesn't need to have its selection overridden
    //
    //        // Fill modals with this new data
    //        get_item(item_name);
    //    },
    //
    //    error: function(XMLHttpRequest, textStatus, errorThrown)
    //    {
    //        spinner.css("display", "none");
    //        error_div.text(XMLHttpRequest.responseText);
    //        error_div.css("display", "");
    //    }
    //});

    alert("Clone is not implemented yet.");
}

function edit_item(item_name)
{
    var action_type = maced_EDIT;
    var modal = $("#" + action_type + "-" + item_name + "-modal");
    var spinner = $("#" + action_type + "-" + item_name + "-spinner");
    var error_div = $("#" + action_type + "-" + item_name + "-error-div");
    var item_select = $("#" + item_name + "-select");
    var merge_item1_select = $("#" + maced_MERGE + "-" + item_name + "1-input");
    var merge_item2_select = $("#" + maced_MERGE + "-" + item_name + "2-input");
    var data = {};
    var item_id = item_select.val();
    var url = maced_urls[item_name];
    var field_name;
    var field_identifier;
    var i;

    if (item_id == "" || typeof item_id === typeof undefined || item_id === null)
    {
        return;
    }

    disable_buttons(item_name);

    for (i = 0; i < maced_field_names[item_name].length; i++)
    {
        field_name = maced_field_names[item_name][i];
        field_identifier = maced_field_identifiers[item_name][i];
        data[field_name] = get_input_item(action_type, item_name, field_identifier);
    }

    data["action_type"] = action_type;
    data["item_id"] = item_id;

    $.ajax(
    {
        async: false,
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
            var name = out_data_json["name"];

            spinner.css("display", "none");
            modal.modal("hide");
            $("#" + action_type + "-" + item_name + "-success-div").css("display", "");

            // Update the option with the new name (could be the same name though)
            item_select.find(":selected").text(name);  // Using selected because it is probably faster
            merge_item1_select.find("option[value=" + item_id + "]").text(name);  // Not using select for these since it can't be guaranteed that is the selected one
            merge_item2_select.find("option[value=" + item_id + "]").text(name);  // Not using select for these since it can't be guaranteed that is the selected one

            // Fill modals with this new data
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

function delete_item(item_name)
{
    var action_type = maced_DELETE;
    var modal = $("#" + action_type + "-" + item_name + "-modal");
    var spinner = $("#" + action_type + "-" + item_name + "-spinner");
    var error_div = $("#" + action_type + "-" + item_name + "-error-div");
    var item_select = $("#" + item_name + "-select");
    var merge_item1_select = $("#" + maced_MERGE + "-" + item_name + "1-input");
    var merge_item2_select = $("#" + maced_MERGE + "-" + item_name + "2-input");
    var item_id = item_select.val();
    var url = maced_urls[item_name];
    var data = {};

    if (item_id == "" || typeof item_id === typeof undefined || item_id === null)
    {
        return;
    }

    disable_buttons(item_name);

    data["action_type"] = action_type;
    data["item_id"] = item_id;

    $.ajax(
    {
        async: false,
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);

            spinner.css("display", "none");
            modal.modal("hide");
            $("#" + action_type + "-" + item_name + "-success-div").css("display", "");

            // Remove the option from the select
            item_select.find(":selected").remove();  // Using selected because it is probably faster
            merge_item1_select.find("option[value=" + item_id + "]").remove();  // Not using select for these since it can't be guaranteed that is the selected one
            merge_item2_select.find("option[value=" + item_id + "]").remove();  // Not using select for these since it can't be guaranteed that is the selected one

            // Fill modals with this with data from whatever is the new selection
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
    var action_type = maced_GET;
    var item_hidden = $("#" + item_name + "-hidden");
    var item_select = $("#" + item_name + "-select");
    var item_id = item_select.val();
    var url = maced_urls[item_name];
    var data = {};
    var field_identifier;
    var i;

    disable_buttons(item_name);

    // Fill the hidden value with the new value. This is what is sent to the backend on post.
    item_hidden.val(item_select.val());

    // This suggests we have the wrong name for the select. Alternatively it was removed some how.
    if (item_select.length == 0)
    {
        // There are cases where the message is irrelevant and so we will check the alert ignore list, and if it is in
        // the list, we won't send an alert.
        // http://stackoverflow.com/questions/237104/array-containsobj-in-javascript
        if ($.inArray(item_name, maced_item_names_with_ignored_alerts) == -1)  // If not in ignore list
        {
            alert(
                "The select with id \"" + item_name + "-select\" is not on the page. Perhaps the id is wrong or it was " +
                "removed from the page dynamically or you didn't set is_used_only_for_maced_fields to True or it was " +
                "just simply forgotten."
            );
        }

        return;
    }

    // Fill the modals with appropriate content
    if (item_id == "" || typeof item_id === typeof undefined || item_id === null)
    {
        for (i = 0; i < maced_field_names[item_name].length; i++)
        {
            field_identifier = maced_field_identifiers[item_name][i];

            // Empty all the modals out for this item
            set_input_item(maced_EDIT, item_name, field_identifier, "", null);
            set_input_item(maced_MERGE, item_name, field_identifier, "", 1);
            set_input_item(maced_MERGE, item_name, field_identifier, "", 2);
            set_input_item(maced_DELETE, item_name, field_identifier, "", null);
        }

        return;
    }

    data["action_type"] = action_type;
    data["item_id"] = item_id;

    $.ajax(
    {
        async: false,
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
            var fields = out_data_json["fields"];
            var field_name;
            var field_identifier;
            var i;
            var merge_select1 = $("#" + maced_MERGE + "-" + item_name + "1-input");

            // 1 is for the merge modal left select. Setting it to the new id
            merge_select1.find("option[value=" + item_id + "]").attr("selected", true);

            // Fill the modals with appropriate content
            for (i = 0; i < maced_field_names[item_name].length; i++)
            {
                field_name = maced_field_names[item_name][i];
                field_identifier = maced_field_identifiers[item_name][i];

                set_input_item(maced_EDIT, item_name, field_identifier, fields[field_name], null);
                set_input_item(maced_MERGE, item_name, field_identifier, fields[field_name], 1);  // Fill in the left panel
                set_input_item(maced_MERGE, item_name, field_identifier, "", 2);  // But empty the right panel
                set_input_item(maced_DELETE, item_name, field_identifier, fields[field_name], null);
            }

            // Force this to reload
            get_item2_for_merge(item_name);
        },

        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            alert(XMLHttpRequest.responseText);
        }
    });
}

// Special get action function for item2 on the merge modal
function get_item2_for_merge(item_name)
{
    var action_type = maced_GET;
    var merge_spinner = $("#" + maced_MERGE + "-" + item_name + "-spinner");
    var merge_error_div = $("#" + maced_MERGE + "-" + item_name + "-error-div");
    var item_select = $("#" + maced_MERGE + "-" + item_name + "2-input");  // 2 is for the right select. The left has already been filled.
    var item_id = item_select.val();
    var url = maced_urls[item_name];
    var data = {};
    var field_identifier;
    var i;

    disable_buttons(item_name);

    // Fill the merge modal's right panel with with appropriate content
    if (item_id == "" || typeof item_id === typeof undefined || item_id === null)
    {
        for (i = 0; i < maced_field_names[item_name].length; i++)
        {
            field_identifier = maced_field_identifiers[item_name][i];

            // Empty the merge modal's right panel for this item
            set_input_item(maced_MERGE, item_name, field_identifier, "", 2);
        }

        return;
    }

    data["action_type"] = action_type;
    data["item_id"] = item_id;

    $.ajax(
    {
        async: false,
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
            var fields = out_data_json["fields"];
            var field_name;
            var field_identifier;
            var i;

            // Fill the modals with appropriate content
            for (i = 0; i < maced_field_names[item_name].length; i++)
            {
                field_name = maced_field_names[item_name][i];
                field_identifier = maced_field_identifiers[item_name][i];

                set_input_item(maced_MERGE, item_name, field_identifier, fields[field_name], 2);  // Fill in the right panel
            }

            reenable_buttons(item_name);
        },

        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            merge_spinner.css("display", "none");
            merge_error_div.text(XMLHttpRequest.responseText);
            merge_error_div.css("display", "");
        }
    });
}

function info_item(item_name)
{
    alert("Info is not implemented yet.");
}

function get_authentication(item_name, main_action_type)
{
    var action_type = maced_AUTHENTICATE;
    var spinner = $("#" + main_action_type + "-" + item_name + "-spinner");
    var error_div = $("#" + main_action_type + "-" + item_name + "-error-div");
    var item_select = $("#" + item_name + "-select");
    var url = maced_urls[item_name];
    var data = {};

    disable_buttons(item_name);

    // This suggests we have the wrong name for the select. Alternatively it was removed some how.
    if (item_select.length == 0)
    {
        // There are cases where the message is irrelevant and so we will check the alert ignore list, and if it is in
        // the list, we won't send an alert.
        // http://stackoverflow.com/questions/237104/array-containsobj-in-javascript
        if ($.inArray(item_name, maced_item_names_with_ignored_alerts) == -1)  // If not in ignore list
        {
            alert(
                "The select with id \"" + item_name + "-select\" is not on the page. Perhaps the id is wrong or it was " +
                "removed from the page dynamically or you didn't set is_used_only_for_maced_fields to True or it was " +
                "just simply forgotten."
            );
        }

        return;
    }

    spinner.css("display", "");
    error_div.css("display", "none");

    data["action_type"] = action_type;

    $.ajax(
    {
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
            var authenticated = out_data_json["authenticated"];

            if (!authenticated)
            {
                alert("Please login to use maced items.");

                if (!(maced_login_url === null))
                {
                    window.location.href = maced_login_url;
                }
            }

            reenable_buttons(item_name);
        },

        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            alert(XMLHttpRequest.responseText);

            spinner.css("display", "none");
            error_div.text(XMLHttpRequest.responseText);
            error_div.css("display", "");
        }
    });
}

function remove_success_divs(item_name)
{
    $("#" + maced_ADD + "-" + item_name + "-success-div").css("display", "none");
    $("#" + maced_EDIT + "-" + item_name + "-success-div").css("display", "none");
    $("#" + maced_MERGE + "-" + item_name + "-success-div").css("display", "none");
    $("#" + maced_DELETE + "-" + item_name + "-success-div").css("display", "none");
}

// Get value from an input for the related item
function get_input_item(action_type, item_name, field_identifier)
{
    var input = $("#" + action_type + "-" + item_name + "-" + field_identifier + "-input");

    // Special case for maced inputs. Only applies to add and edit.
    if (input.length == 0 && (action_type == maced_ADD || action_type == maced_EDIT))
    {
        input = $("#" + action_type + "_type-" + item_name + "-" + field_identifier + "-select");

        if (action_type == maced_EDIT)
        {
            get_item(action_type + "_type-" + item_name + "-" + field_identifier);
        }
    }

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
function set_input_item(action_type, item_name, field_identifier, value, merge_panel_number)
{
    var input;

    if (action_type == maced_MERGE)
    {
        input = $("#" + action_type + "-" + item_name + merge_panel_number + "-" + field_identifier + "-input");
    }
    else
    {
        input = $("#" + action_type + "-" + item_name + "-" + field_identifier + "-input");

        // Special case for maced inputs. Only applies to add and edit.
        if (input.length == 0 && (action_type == maced_ADD || action_type == maced_EDIT))
        {
            input = $("#" + action_type + "_type-" + item_name + "-" + field_identifier + "-select");

            // If the input exists and is for the edit section
            if (action_type == maced_EDIT && input.length > 0)
            {
                input.val(value).trigger("change");

                return;
            }
        }
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
        if (action_type != maced_ADD)
        {
            input.val(value);
        }
    }
    else
    {
        //alert("#" + action_type + "-" + item_name + "-" + field_identifier + "-input");
        alert("Ensure that you have added \"" + item_name + "\" to the page");
        alert("Input type not implemented for set_input_item()");
    }
}

function reenable_buttons(item_name)
{
    var merge_button = $("#" + maced_MERGE + "-" + item_name + "-button");
    var merge_confirmation_button = $("#" + maced_MERGE + "-" + item_name + "-confirmation-button");
    var merge_declination_button = $("#" + maced_MERGE + "-" + item_name + "-declination-button");
    var add_button = $("#" + maced_ADD + "-" + item_name + "-button");
    var clone_button = $("#" + maced_CLONE + "-" + item_name + "-button");
    var edit_button = $("#" + maced_EDIT + "-" + item_name + "-button");
    var delete_button = $("#" + maced_DELETE + "-" + item_name + "-button");
    var info_button = $("#" + maced_INFO + "-" + item_name + "-button");
    var merge_select1 = $("#" + maced_MERGE + "-" + item_name + "1-input");
    var merge_select2 = $("#" + maced_MERGE + "-" + item_name + "2-input");

    // If there is more than 1 item to merge, re-enable the merge button
    if (merge_select1.find("option").length > 1)
    {
        merge_button.prop("disabled", false);
    }

    // Re-enable the declination button
    merge_declination_button.prop("disabled", false);

    // If both selects have the same thing in them, aka trying to merge with itself.
    if (merge_select1.val() == merge_select2.val())
    {
        merge_confirmation_button.prop("disabled", true);
    }
    else
    {
        merge_confirmation_button.prop("disabled", false);
    }

    // Enable the rest of the buttons
    add_button.prop("disabled", false);
    clone_button.prop("disabled", false);
    edit_button.prop("disabled", false);
    delete_button.prop("disabled", false);
    info_button.prop("disabled", false);
}

function disable_buttons(item_name)
{
    var merge_button = $("#" + maced_MERGE + "-" + item_name + "-button");
    var merge_confirmation_button = $("#" + maced_MERGE + "-" + item_name + "-confirmation-button");
    var merge_declination_button = $("#" + maced_MERGE + "-" + item_name + "-declination-button");
    var add_button = $("#" + maced_ADD + "-" + item_name + "-button");
    var clone_button = $("#" + maced_CLONE + "-" + item_name + "-button");
    var edit_button = $("#" + maced_EDIT + "-" + item_name + "-button");
    var delete_button = $("#" + maced_DELETE + "-" + item_name + "-button");
    var info_button = $("#" + maced_INFO + "-" + item_name + "-button");

    merge_button.prop("disabled", true);
    merge_confirmation_button.prop("disabled", true);
    merge_declination_button.prop("disabled", true);
    add_button.prop("disabled", true);
    clone_button.prop("disabled", true);
    edit_button.prop("disabled", true);
    delete_button.prop("disabled", true);
    info_button.prop("disabled", true);
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

function maced_is_loaded()
{
    alert("DONE");
}