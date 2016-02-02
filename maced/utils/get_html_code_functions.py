# MACED
def get_items_html_code_for_maced(item_name, action_type, field_html_name, field_name, maced_info):
    if action_type == "add" or action_type == "edit":
        return get_html_code_with_replaced_ids_for_maced_fields(maced_info, action_type, item_name, field_name)
    elif action_type == "merge":
        options_html_code = ""  # get_html_code_for_options(options_info)

        html_code = get_merge_html_code_for_select(item_name, field_html_name, field_name, options_html_code)
        simple_maced_info = {}
        simple_maced_info["context"] = maced_info["context"]
        simple_maced_info["maced_name"] = maced_info["maced_name"]
        simple_maced_info["maced_item_html_code"] = html_code
        simple_maced_info["maced_modal_html_code"] = maced_info["maced_modal_html_code"]

        return get_html_code_with_replaced_ids_for_maced_fields(simple_maced_info, action_type, item_name, field_name)
    else:
        options_html_code = ""  # get_html_code_for_options(options_info)

        html_code = '<b class="maced">' + field_html_name + ': </b>'
        html_code += '<select class="maced form-control" id="' + action_type + '-' + item_name + '-' + field_name + '-input" '

        if action_type == "delete" or action_type == "clone" or action_type == "info":
            html_code += 'disabled '

        html_code += '>' + options_html_code + '</select>'

        simple_maced_info = {}
        simple_maced_info["context"] = maced_info["context"]
        simple_maced_info["maced_name"] = maced_info["maced_name"]
        simple_maced_info["maced_item_html_code"] = html_code
        simple_maced_info["maced_modal_html_code"] = maced_info["maced_modal_html_code"]

        return get_html_code_with_replaced_ids_for_maced_fields(simple_maced_info, action_type, item_name, field_name)


# TEXT
def get_items_html_code_for_text(item_name, action_type, field_html_name, field_name):
    if action_type == "merge":
        return get_merge_html_code_for_text(item_name, field_html_name, field_name)

    html_code = '<b class="maced">' + field_html_name + ': </b>'
    html_code += '<input type="text" class="maced form-control" id="' + action_type + '-' + item_name + '-' + field_name + '-input" '

    if action_type == "delete" or action_type == "clone" or action_type == "info":
        html_code += 'disabled '

    html_code += '/>'

    return html_code


def get_merge_html_code_for_text(item_name, field_html_name, field_name):
    # Create row name
    html_code = '<tr class="maced">'
    html_code += '<th class="maced">' + field_html_name + ': </th>'

    # Create left panel
    html_code += \
        '<td class="maced">' \
            '<input type="text" class="maced form-control" id="merge-' + item_name + '1-' + field_name + '-input" readonly />' \
        '</td>'

    # Create middle panel
    html_code += \
        '<td class="maced" style="background-color: #F7D358;">' \
            '<input type="text" class="maced form-control" id="merge-' + item_name + '-' + field_name + '-input" />' \
        '</td>'

    # Create right panel for merge
    html_code += \
        '<td class="maced">' \
            '<input type="text" class="maced form-control" id="merge-' + item_name + '2-' + field_name + '-input" readonly />' \
        '</td>'

    html_code += '</tr>'

    return html_code


# COLOR
def get_items_html_code_for_color(item_name, action_type, field_html_name, field_name):
    if action_type == "merge":
        return get_merge_html_code_for_color(item_name, field_html_name, field_name)

    html_code = '<b class="maced">' + field_html_name + ': </b>'
    html_code += '<input type="color" class="maced form-control" id="' + action_type + '-' + item_name + '-' + field_name + '-input" value="#00FF00" '

    if action_type == "delete" or action_type == "clone" or action_type == "info":
        html_code += 'disabled '

    html_code += '/>'

    return html_code


def get_merge_html_code_for_color(item_name, field_html_name, field_name):
    # Create row name
    html_code = '<tr class="maced">'
    html_code += '<th class="maced">' + field_html_name + ': </th>'

    # Create left panel
    html_code += \
        '<td class="maced">' \
            '<input type="color" class="maced form-control" id="merge-' + item_name + '1-' + field_name + '-input" value="#00FF00" disabled />' \
        '</td>'

    # Create middle panel
    html_code += \
        '<td class="maced" style="background-color: #F7D358;">' \
            '<input type="color" class="maced form-control" id="merge-' + item_name + '-' + field_name + '-input" value="#00FF00" />' \
        '</td>'

    # Create right panel for merge
    html_code += \
        '<td class="maced">' \
            '<input type="color" class="maced form-control" id="merge-' + item_name + '2-' + field_name + '-input" value="#00FF00" disabled />' \
        '</td>'

    html_code += '</tr>'

    return html_code


# SELECT
def get_items_html_code_for_select(item_name, action_type, field_html_name, field_name, options_info):
    options_html_code = get_html_code_for_options(options_info)

    if action_type == "merge":
        return get_merge_html_code_for_select(item_name, field_html_name, field_name, options_html_code)

    html_code = '<b class="maced">' + field_html_name + ': </b>'
    html_code += '<select class="maced form-control" id="' + action_type + '-' + item_name + '-' + field_name + '-input" '

    if action_type == "delete" or action_type == "clone" or action_type == "info":
        html_code += 'disabled '

    html_code += '>' + options_html_code + '</select>'

    return html_code


def get_merge_html_code_for_select(item_name, field_html_name, field_name, options_html_code):
    # Create row name
    html_code = '<tr class="maced">'
    html_code += '<th class="maced">' + field_html_name + ': </th>'

    # Create left panel
    html_code += \
        '<td class="maced">' \
            '<select class="maced form-control" id="merge-' + item_name + '1-' + field_name + '-input" readonly >' + options_html_code + '</select>' \
        '</td>'

    # Create middle panel
    html_code += \
        '<td class="maced" style="background-color: #F7D358;">' \
            '<select class="maced form-control" id="merge-' + item_name + '-' + field_name + '-input">' + options_html_code + '</select>' \
        '</td>'

    # Create right panel for merge
    html_code += \
        '<td class="maced">' \
            '<select class="maced form-control" id="merge-' + item_name + '2-' + field_name + '-input" readonly >' + options_html_code + '</select>' \
        '</td>'

    html_code += '</tr>'

    return html_code


# OPTIONS FOR SELECT
def get_html_code_for_options(options_list, selected_index=None):
    html_code = ''

    for i in range(len(options_list)):
        html_code += '<option class="maced" value="' + str(options_list[i][0]) + '" '

        if i == selected_index:
            html_code += 'selected'

        html_code += '> ' + str(options_list[i][1]) + ' </option>'

    return html_code


# Other
# Search dependencies and change their ids to the full path
def get_html_code_with_replaced_ids_for_maced_fields(maced_info, action_type, item_name, field_name):
    maced_name = maced_info["maced_name"]
    maced_item_html_code = maced_info["maced_item_html_code"]
    maced_modal_html_code = maced_info["maced_modal_html_code"]
    context = maced_info["context"]
    maced_data = context["maced_data"]
    field_identifier = action_type + "_type-" + item_name + "-" + field_name
    full_field_identifier = item_name + "-" + field_identifier  # Intentionally adding item_name twice...

    # First we will handle the modals and add them to the context by replacing all occurrences of the name of the object
    context["maced_modals"] += maced_modal_html_code.replace(maced_name, full_field_identifier)

    # Next we will copy the html for the maced item then replace all occurrences of the name of the object
    html_code = maced_item_html_code.replace(maced_name, full_field_identifier)

    # Finally we will add field_names, field_identifiers, and the custom item_name to the context
    maced_data["field_names"][item_name].append(field_name)
    maced_data["field_identifiers"][item_name].append(field_identifier)

    maced_data["item_names"].append(full_field_identifier)
    maced_data["field_names"][full_field_identifier] = maced_data["field_names"][maced_name]
    maced_data["field_identifiers"][full_field_identifier] = maced_data["field_identifiers"][maced_name]
    maced_data["get_urls"][full_field_identifier] = maced_data["get_urls"][maced_name]

    # # Now replace the select id (which has been modified so we need to search for the modified version)
    # # Used to be maced_name + "-select"
    # old_select_id = item_name + "-" + field_name + "-select"
    #
    # # The new id will simply be a normal select syntax
    # new_select_id = action_type + "-" + item_name + "-" + field_name + "-input"
    #
    # # Copy the html and replace the select id with the new one
    # html_code = html_code.replace(old_select_id, new_select_id)

    return html_code