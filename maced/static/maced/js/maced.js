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
var maced_names = maced_data["maced_names"];
var maced_field_names = JSON.parse(maced_data["field_names"]);
var maced_field_identifiers = JSON.parse(maced_data["field_identifiers"]);
var maced_urls = JSON.parse(maced_data["urls"]);
var maced_login_url = JSON.parse(maced_data["login_url"]);

// This ridiculously named variable is used as a cheap way to be able to know when we are getting the last item. If we
// are getting the last item, we will call maced_callback if it exists. Then we will set it to "" again.
var maced_item_name_of_last_item_to_load = "";

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

    maced_item_name_of_last_item_to_load = maced_item_names[maced_item_names.length - 1];

    // Loop through all items and add "click" and "change" events and load any initial data if any exists.
    for (i = 0; i < maced_item_names.length; i++)
    {
        item_name = maced_item_names[i];
        get_authentication(item_name);  // Run authentication to set initial button states

        // Add click events for all buttons to remove success divs
        for (var action_type in maced_ACTION_TYPES)
        {
            $("#" + maced_ACTION_TYPES[action_type] + "-" + item_name + "-button").click({item_name: item_name}, function(event)
            {
                remove_success_divs(event.data.item_name);
            });
        }

        // Get the info for the pre-selected item. If none, then skip. Do the same for merge selects on merge modal.
        // 0 represents a regular get, 1 is left merge select, 2 is right merge select.
        item_select = $("#" + item_name + "-select");
        get_item(item_name, 0);
        get_item(item_name, 1);
        get_item(item_name, 2);

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
            get_item(event.data.item_name, 0);
        });

        // Add change event for merge modal left select. Using "input" because all input fields on modals use "input".
        $("#merge-" + item_name + "1-input").change({item_name: item_name}, function(event)
        {
            get_item(event.data.item_name, 1);
        });

        // Add change event for merge modal right select. Using "input" because all input fields on modals use "input".
        $("#merge-" + item_name + "2-input").change({item_name: item_name}, function(event)
        {
            get_item(event.data.item_name, 2);
        });
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
    var previously_selected_item_id = item_select.val();
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

    if (item1_id == item2_id)
    {
        reenable_buttons(item_name);

        spinner.hide();
        error_div.text("You cannot merge an item with itself");
        error_div.show();

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
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
            var name = out_data_json["name"];
            var field_identifier;
            var maced_name = maced_names[item_name];

            spinner.hide();
            modal.modal("hide");
            $("#" + action_type + "-" + item_name + "-success-div").show();

            // Remove the old options and select the new one on every select that is connected to this base maced_item.
            // Technically this is just deleting the second one and selecting the first one and giving it the new name.
            $(".maced-" + maced_name).each(function()
            {
                var should_be_selected = false;

                // If the select was using one of the merged items, then set this select to the new item
                if (previously_selected_item_id == item1_id || previously_selected_item_id == item2_id)
                {
                    should_be_selected = true;
                }

                merge_items_in_select($(this), item1_id, item2_id, name, should_be_selected);
            });

            //merge_items_in_select(item_select, item1_id, item2_id, name);
            //merge_items_in_select(merge_item1_select, item1_id, item2_id, name);
            //merge_items_in_select(merge_item2_select, item1_id, item2_id, name);

            // Reset the modal for the next item merge
            for (i = 0; i < maced_field_names[item_name].length; i++)
            {
                field_identifier = maced_field_identifiers[item_name][i];

                // Sending in "" for merge_panel_number so that it finds the middle panel, which doesn't have a number.
                // This should probably be changed to 0 or something, but it would cause other issues. This is the
                // easiest solution.
                set_input_item(action_type, item_name, field_identifier, "", "");
            }

            // Fill modals with this new data
            get_item(item_name, 0);
        },

        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            reenable_buttons(item_name);

            spinner.hide();
            error_div.text(XMLHttpRequest.responseText);
            error_div.show();
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

    disable_buttons(item_name);

    for (i = 0; i < maced_field_names[item_name].length; i++)
    {
        field_name = maced_field_names[item_name][i];
        field_identifier = maced_field_identifiers[item_name][i];
        data[field_name] = get_input_item(action_type, item_name, field_identifier);
    }

    data["action_type"] = action_type;

    $.ajax(
    {
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
            var id = out_data_json["id"];
            var name = out_data_json["name"];
            var field_identifier;
            var maced_name = maced_names[item_name];

            spinner.hide();
            modal.modal("hide");
            $("#" + action_type + "-" + item_name + "-success-div").show();

            // Add the new option to every select that is connected to this base maced_item and select it if necessary
            $(".maced-" + maced_name).each(function()
            {
                var should_be_selected = false;

                // Merge select 2 doesn't need to have its selection overridden
                if ($(this) == item_select || $(this) == merge_item1_select)
                {
                    should_be_selected = true;
                }

                add_item_to_select($(this), id, name, should_be_selected);
            });

            // Reset the modal for the next item addition
            for (i = 0; i < maced_field_names[item_name].length; i++)
            {
                field_identifier = maced_field_identifiers[item_name][i];
                set_input_item(action_type, item_name, field_identifier, "", null);
            }

            // Fill modals with this new data
            get_item(item_name, 0);
        },

        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            reenable_buttons(item_name);

            spinner.hide();
            error_div.text(XMLHttpRequest.responseText);
            error_div.show();
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
    //        spinner.hide();
    //        modal.modal("hide");
    //        $("#" + action_type + "-" + item_name + "-success-div").show();
    //
    //        // Add the new option to the select and select it
    //        add_item_to_select(item_select, id, name, true);
    //        add_item_to_select(merge_item1_select, id, name, true);
    //        add_item_to_select(merge_item2_select, id, name, false);  // Select 2 doesn't need to have its selection overridden
    //
    //        // Fill modals with this new data
    //        get_item(item_name, 0);
    //    },
    //
    //    error: function(XMLHttpRequest, textStatus, errorThrown)
    //    {
    //        reenable_buttons(item_name);
    //
    //        spinner.hide();
    //        error_div.text(XMLHttpRequest.responseText);
    //        error_div.show();
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
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);
            var name = out_data_json["name"];

            spinner.hide();
            modal.modal("hide");
            $("#" + action_type + "-" + item_name + "-success-div").show();

            // Update the option with the new name (could be the same name though)
            edit_item_name_in_select(item_select, item_id, name);
            edit_item_name_in_select(merge_item1_select, item_id, name);
            edit_item_name_in_select(merge_item2_select, item_id, name);

            // Fill modals with this new data
            get_item(item_name, 0);
        },
        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            reenable_buttons(item_name);

            spinner.hide();
            error_div.text(XMLHttpRequest.responseText);
            error_div.show();
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
        data: data,
        type: "POST",
        url: url,

        success: function(out_data)
        {
            var out_data_json = JSON.parse(out_data);

            spinner.hide();
            modal.modal("hide");
            $("#" + action_type + "-" + item_name + "-success-div").show();

            // Remove the option from the select
            delete_item_from_select(item_select, item_id);
            delete_item_from_select(merge_item1_select, item_id);
            delete_item_from_select(merge_item2_select, item_id);

            // Fill modals with this with data from whatever is the new selection
            get_item(item_name, 0);
        },

        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            reenable_buttons(item_name);

            spinner.hide();
            error_div.text(XMLHttpRequest.responseText);
            error_div.show();
        }
    });
}

// merge_select_number is used to allow more rounds of "getting" without having to make separate functions that do
// almost all the same work. This value will be 0 for a regular get, 1 for a merge 1 get, and 2 for a merge 2
// get.
// Please note that a regular get will also fill the merge 1 select and thus will not need a merge 1 get, but it will
// not fill the merge 2 select. Although a regular get won't fill the merge 2 select, it will refresh it in case that
// merge is not up to date. A regular get refreshes the merge 2 select by forcing a merge 2 get. For these reasons,
// a regular get will empty the merge 1 select, but not the merge 2 select and will call for a merge 2 get but not a
// merge 1 get. Hope that makes sense. :)
function get_item(item_name, merge_select_number)
{
    var action_type = maced_GET;
    var url = maced_urls[item_name];
    var merge_select1 = $("#" + maced_MERGE + "-" + item_name + "1-input");  // 1 is for the left select
    var merge_spinner = $("#" + maced_MERGE + "-" + item_name + "-spinner");
    var merge_error_div = $("#" + maced_MERGE + "-" + item_name + "-error-div");
    var data = {};
    var field_identifier;
    var i;
    var item_select;
    var item_id;

    // This switch serves as a error catch (makes sure it is 0-2 so that the rest can assume).
    switch (merge_select_number)
    {
        case 0:  // Regular get
            item_select = $("#" + item_name + "-select");
            break;
        case 1:  // Left merge select get
            item_select = merge_select1;
            break;
        case 2:  // Right merge select get
            item_select = $("#" + maced_MERGE + "-" + item_name + "2-input");  // 2 is for the left select
            break;
        default:
            alert(
                "Invalid merge_select_number of \"" + merge_select_number + "\". This is probably a problem with " +
                "django-maced."
            );
            return;
    }

    // This suggests we have the wrong name for the select. Alternatively it was removed some how.
    if (item_select.length == 0)
    {
        alert(
            "The select with id \"" + item_name + "-select\" is not on the page. Perhaps the id is wrong or it " +
            "was removed from the page dynamically or you didn't set is_used_only_for_maced_fields to True or it " +
            "was just simply forgotten."
        );

        return;
    }

    disable_buttons(item_name);

    item_id = item_select.val();

    if (merge_select_number == 0)  // Regular get
    {
        // Fill the hidden value with the new value. This is what is sent to the backend on post.
        $("#" + item_name + "-hidden").val(item_id);
    }

    // Empty the modals since this item_id is invalid/blank
    if (item_id == "" || typeof item_id === typeof undefined || item_id === null)
    {
        for (i = 0; i < maced_field_names[item_name].length; i++)
        {
            field_identifier = maced_field_identifiers[item_name][i];

            // Empty all the modals out for this item
            if (merge_select_number == 0)
            {
                //set_input_item(maced_CLONE, item_name, field_identifier, "", null);
                set_input_item(maced_EDIT, item_name, field_identifier, "", null);
                set_input_item(maced_DELETE, item_name, field_identifier, "", null);
                //set_input_item(maced_INFO, item_name, field_identifier, "", null);
            }
            else  // If not 0, merge_select_number must be 1 or 2
            {
                set_input_item(maced_MERGE, item_name, field_identifier, "", merge_select_number);
            }
        }

        reenable_buttons(item_name);

        return;
    }

    if (merge_select_number == 0)  // Regular get
    {
        // 1 is for the merge modal left select. Setting it to the new id
        merge_select1.find("option[value=" + item_id + "]").prop("selected", true);
    }

    data["action_type"] = action_type;
    data["item_id"] = item_id;

    $.ajax(
    {
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

                if (merge_select_number == 0)
                {
                    set_input_item(maced_MERGE, item_name, field_identifier, fields[field_name], 1);  // Fill in the left panel
                    //set_input_item(maced_CLONE, item_name, field_identifier, fields[field_name], null);
                    set_input_item(maced_EDIT, item_name, field_identifier, fields[field_name], null);
                    set_input_item(maced_DELETE, item_name, field_identifier, fields[field_name], null);
                    //set_input_item(maced_INFO, item_name, field_identifier, fields[field_name], null);
                }
                else  // If not 0, merge_select_number must be 1 or 2
                {
                    set_input_item(maced_MERGE, item_name, field_identifier, fields[field_name], merge_select_number);
                }
            }

            if (merge_select_number == 0)
            {
                // Send another get request but for merge select 2. This will force a reload in case it is out of date.
                // Also, since a regular get calls a merge 2 get, we don't need to re-enable the buttons here.
                get_item(item_name, 2);
            }
            else
            {
                reenable_buttons(item_name);
            }

            if (item_name == maced_item_name_of_last_item_to_load && merge_select_number == 2)
            {
                maced_item_name_of_last_item_to_load = "";

                // This is a callback function to signal that maced is all done on the page. This is provided by you in order to
                // allow specialized code that doesn't start until maced is done. For instance, if you would like to show a spinner
                // while maced is loading, you can do so by using this function to shut it off. If this function is missing, it
                // will not fire.
                if (typeof maced_callback !== typeof undefined && maced_callback !== null && typeof maced_callback === "function")
                {
                    maced_callback();
                }
            }
        },

        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            reenable_buttons(item_name);

            if (merge_select_number == 1 || merge_select_number == 2)
            {
                merge_spinner.hide();
                merge_error_div.text(XMLHttpRequest.responseText);
                merge_error_div.show();
            }
            else
            {
                alert(XMLHttpRequest.responseText);
            }
        }
    });
}

function info_item(item_name)
{
    alert("Info is not implemented yet.");
}

function get_authentication(item_name)
{
    var action_type = maced_AUTHENTICATE;
    var item_select = $("#" + item_name + "-select");
    var url = maced_urls[item_name];
    var data = {};

    // This suggests we have the wrong name for the select. Alternatively it was removed some how.
    if (item_select.length == 0)
    {
        alert(
            "The select with id \"" + item_name + "-select\" is not on the page. Perhaps the id is wrong or it was " +
            "removed from the page dynamically or you didn't set is_used_only_for_maced_fields to True or it was " +
            "just simply forgotten."
        );

        return;
    }

    disable_buttons(item_name);

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
                //alert("Please login to use maced items.");

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

            reenable_buttons(item_name);
        }
    });
}

function remove_success_divs(item_name)
{
    $("#" + maced_ADD + "-" + item_name + "-success-div").hide();
    $("#" + maced_EDIT + "-" + item_name + "-success-div").hide();
    $("#" + maced_MERGE + "-" + item_name + "-success-div").hide();
    $("#" + maced_DELETE + "-" + item_name + "-success-div").hide();
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
            get_item(action_type + "_type-" + item_name + "-" + field_identifier, 0);
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
        //alert(
        //    "action_type = " + action_type + "\nitem_name = " + item_name + "\nfield_identifier = " + field_identifier +
        //    "\nmerge_panel_number = " + merge_panel_number + "\nvalue = " + value + "\ninput.length = " +
        //    input.length
        //);
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
    //var clone_button = $("#" + maced_CLONE + "-" + item_name + "-button");
    var edit_button = $("#" + maced_EDIT + "-" + item_name + "-button");
    var delete_button = $("#" + maced_DELETE + "-" + item_name + "-button");
    //var info_button = $("#" + maced_INFO + "-" + item_name + "-button");
    var merge_select1 = $("#" + maced_MERGE + "-" + item_name + "1-input");
    var merge_select2 = $("#" + maced_MERGE + "-" + item_name + "2-input");
    var item_select = $("#" + item_name + "-select");
    var item_id = item_select.val();

    // Enable buttons that should always be available
    merge_declination_button.prop("disabled", false);
    add_button.prop("disabled", false);

    // If there is more than 1 item to merge, re-enable the merge button
    if (merge_select1.find("option").length > 1)
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

    if (item_id == "" || typeof item_id === typeof undefined || item_id === null)
    {
        return;
    }

    // Enable the rest of the buttons
    //clone_button.prop("disabled", false);
    edit_button.prop("disabled", false);
    delete_button.prop("disabled", false);
    //info_button.prop("disabled", false);
}

function disable_buttons(item_name)
{
    var merge_button = $("#" + maced_MERGE + "-" + item_name + "-button");
    var merge_confirmation_button = $("#" + maced_MERGE + "-" + item_name + "-confirmation-button");
    var merge_declination_button = $("#" + maced_MERGE + "-" + item_name + "-declination-button");
    var add_button = $("#" + maced_ADD + "-" + item_name + "-button");
    //var clone_button = $("#" + maced_CLONE + "-" + item_name + "-button");
    var edit_button = $("#" + maced_EDIT + "-" + item_name + "-button");
    var delete_button = $("#" + maced_DELETE + "-" + item_name + "-button");
    //var info_button = $("#" + maced_INFO + "-" + item_name + "-button");

    merge_button.prop("disabled", true);
    merge_confirmation_button.prop("disabled", true);
    merge_declination_button.prop("disabled", true);
    add_button.prop("disabled", true);
    //clone_button.prop("disabled", true);
    edit_button.prop("disabled", true);
    delete_button.prop("disabled", true);
    //info_button.prop("disabled", true);
}

function change_item_visibility(item_name, should_turn_on)
{
    var item_tr = $("#" + item_name + "-tr");

    if (should_turn_on)
    {
        item_tr.show();
    }
    else
    {
        item_tr.hide();
    }
}

function merge_into_middle(from_id, to_id)
{
    var from_input = $("#" + from_id);
    var to_input = $("#" + to_id);

    to_input.val(from_input.val());
}

function merge_all_into_middle(modal_id, panel_number)
{
    var modal = $("#" + modal_id);
    var merge_buttons = modal.find(".maced-merge-button-" + panel_number);

    merge_buttons.each(function()
    {
        $(this).trigger("click");
    });
}

function merge_items_in_select(item_select, item1_id, item2_id, new_name, should_be_selected)
{
    delete_item_from_select(item_select, item2_id);

    var option = item_select.find("option[value=" + item1_id + "]");

    if (should_be_selected)
    {
        option.prop("selected", true);
    }

    option.text(new_name);
}

function add_item_to_select(item_select, item_id, name, should_be_selected)
{
    var option = $("<option></option>").prop("value", item_id).text(name);

    if (should_be_selected)
    {
        option.prop("selected", true);
    }

    item_select.append(option);
}

// Originally was going to call this update instead of edit, but I thought it fits better with macEd
function edit_item_name_in_select(item_select, item_id, new_name)
{
    item_select.find("option[value=" + item_id + "]").text(new_name);
}

// Originally was going to call this remove instead of delete, but I thought it fits better with maceD
function delete_item_from_select(item_select, item_id)
{
    item_select.find("option[value=" + item_id + "]").remove();
}