# TEXT
def get_items_html_code_for_text(item_name, action_type, field_html_name, field_name):
    html_code = "<b>" + field_html_name + ": </b>"
    html_code += '<input type="text" class="form-control" id="' + action_type + "-" + item_name + "-" + field_name + '-input" '

    if action_type == "delete" or action_type == "merge":
        html_code += "disabled "

    html_code += "/>"

    return html_code


# COLOR
def get_items_html_code_for_color(item_name, action_type, field_html_name, field_name):
    html_code = "<b>" + field_html_name + ": </b>"
    html_code += '<input type="color" id="' + action_type + "-" + item_name + "-" + field_name + '-input" value="#00FF00" '

    if action_type == "delete" or action_type == "merge":
        html_code += "disabled "

    html_code += "/>"

    return html_code


# SELECT
def get_items_html_code_for_select(item_name, action_type, field_html_name, field_name, options_info):
    html_code = "<b>" + field_html_name + ": </b>"

    html_code += '<select class="form-control" id="' + action_type + "-" + item_name + "-" + field_name + '-input" '

    if action_type == "delete" or action_type == "merge":
        html_code += "disabled "

    html_code += ">"
    html_code += get_html_code_for_options(options_info)
    html_code += "</select>"

    return html_code


# OPTIONS FOR SELECT
def get_html_code_for_options(options_list):
    html_code = ""

    for i in range(len(options_list)):
        html_code += '<option value="' + str(options_list[i][0]) + '"> ' + str(options_list[i][1]) + " </option>"

    return html_code