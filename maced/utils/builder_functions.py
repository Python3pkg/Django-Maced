from django.core.urlresolvers import reverse
from django.shortcuts import render
from maced.utils.constants import VALID_INPUT_TYPES, VALID_SELECT_TYPES, ACTION_TYPES
from maced.utils.get_html_code_functions import get_html_code_for_options
from maced.utils.misc import validate_select_options

#  Used to prevent recursive importing since builder_functions.py and get_html_code_functions.py both rely on each other
#       through recursion. This is used to recursively/dynamically create maced items within maced items.
try:
    from maced.utils.maced_creator import insert_items_html_code
except ImportError:
    pass


def build_html_code(context, item_options_list, item_name, item_html_name, field_list):
    html_code_dictionary = {}
    html_code_dictionary[item_name] = {}

    for action_type in ACTION_TYPES:
        html_code_dictionary[item_name][action_type] = ""

    maced_object_option_html_code = get_html_code_for_options(item_options_list)

    # Merge has special html before the regular html
    html_code_dictionary[item_name]["merge"] = \
        '<table class="maced table">' + \
            '<tr class="maced">' + \
                '<th class="maced"></th>' + \
                '<th class="maced" style="text-align: center; vertical-align: middle;"> ' + item_html_name + ' 1 </th>' + \
                '<th class="maced" style="text-align: center; vertical-align: middle; background-color: #F7D358;">' + \
                    'Resulting ' + item_html_name + \
                '</th>' + \
                '<th class="maced" style="text-align: center; vertical-align: middle;"> ' + item_html_name + ' 2 </th>' + \
            '</tr>' + \
            '<tr class="maced">' + \
                '<th class="maced"></th>' + \
                '<th>' + \
                    '<select class="maced form-control" id="merge-' + item_name + '1-input" disabled >' + maced_object_option_html_code + '</select>' + \
                '</th>' + \
                '<th class="maced" style="background-color: #F7D358;"></th>' + \
                '<th>' + \
                    '<select class="maced form-control" id="merge-' + item_name + '2-input">' + maced_object_option_html_code + '</select>' + \
                '</th>' + \
            '</tr>'

    # Create html input fields for each field on the model
    for field in field_list:
        extra_info = None

        if "name" not in field:
            raise ValueError("Field in field_list is missing \"name\"")

        if "type" not in field:
            field["type"] = "text"

        if field["type"] not in VALID_INPUT_TYPES:
            raise ValueError(
                "Field named " + str(field["name"]) + " in field_list for " + str(item_name) + " has a type of " +
                str(field["type"]) + " which is invalid"
            )

        if field["type"] == "select":
            if "select_type" not in field:
                field["select_type"] = "object"

            if field["select_type"] not in VALID_SELECT_TYPES:
                raise ValueError(
                    "The select for the field named " + str(field["name"]) + " has a type of " +
                    str(field["select_type"]) + " which is invalid"
                )

            if "options" in field:
                extra_info = field["options"]

                # Will raise errors if invalid, else it move on
                validate_select_options(extra_info, field, item_name, field["select_type"])
            else:
                raise ValueError(
                    "Field " + str(field["name"]) + " in field_list for " + str(item_name) +
                    " is set to type \"select\", but doesn't have \"options\""
                )

        if field["type"] == "maced":
            if "maced_name" not in field:
                field["maced_name"] = field["name"]

            if field["maced_name"] + "_item" not in context:
                raise ValueError(
                    "Field named " + str(field["name"]) + " in field_list for " + str(item_name) +
                    " is set as type \"maced\" and is referencing " + str(field["maced_name"]) + " but it is not in " +
                    "the context. Please make sure you have created a maced item for it and ensure that it is " +
                    "created prior to this one. If you are trying to use an object with a name different from the " +
                    "name given for \"name\" for this field, please use \"maced_name\" to specify the name you want. " +
                    "By default, \"name\" is used."
                )

            if field["maced_name"] + "_maced_modal" not in context:
                raise RuntimeError(
                    "Field named " + str(field["name"]) + " in field_list for " + str(item_name) +
                    " is set as type \"maced\" and is referencing " + str(field["maced_name"]) + ". " +
                    str(field["maced_name"]) + "_item is in the context, but " + str(field["maced_name"]) +
                    "_maced_modal isn't. This is likely a programming error with django-maced."
                )

            if item_name + "_dependencies" not in context:
                raise RuntimeError(item_name + "_dependencies was not in the context. Did you overwrite it?")

            if field["maced_name"] + "_builder" not in context:
                raise RuntimeError(item_name + "_builder was not in the context. Did you overwrite it?")

            # Add this maced item as a dependency of the main item
            dependency = {}
            dependency["maced_name"] = field["maced_name"]
            dependency["builder"] = context[field["maced_name"] + "_builder"]

            context[item_name + "_dependencies"].append(dependency)

            extra_info = {}
            extra_info["maced_item_html_code"] = context[field["maced_name"] + "_item"]
            extra_info["maced_name"] = field["maced_name"]
            extra_info["context"] = context

            # # Hacking in a <b> </b> for now until I make a better solution
            # old_row_name_th = '<th class="maced" id="' + extra_info["maced_name"] + '-row-name-th"> ' + item_html_name + ': </th>'
            # new_row_name_th = '<th class="maced" id="' + item_name + '-row-name-th"> <b>' + item_html_name + ': </b> </th>'
            # extra_info = extra_info["html_code"].replace(old_row_name_th, new_row_name_th)

            # field["select_type"] = "object"  # This is used for clone, merge, delete, and info since they are just selects

            # if "options" in field:
            #     extra_info = field["options"]
            #
            #     # Will raise errors if invalid, else it move on
            #     validate_select_options(extra_info, field, item_name, field["select_type"])
            # else:
            #     raise ValueError(
            #         "Field " + str(field["name"]) + " in field_list for " + str(item_name) +
            #         " is set to type \"maced\", but doesn't have \"options\". This still needs options for merge, " +
            #         "clone, delete, and info modals."
            #     )

        if "html_name" not in field:
            field["html_name"] = field["name"].title()

        insert_items_html_code(html_code_dictionary, item_name, field["type"], field["html_name"], field["name"], extra_info)

    # Merge has special html after the regular html
    html_code_dictionary[item_name]["merge"] += "</table>"

    return html_code_dictionary


def build_urls(item_name, name_of_app_with_urls, maced_data):
    add_base_url = name_of_app_with_urls + ".add_" + item_name
    edit_base_url = name_of_app_with_urls + ".edit_" + item_name
    merge_base_url = name_of_app_with_urls + ".merge_" + item_name
    delete_base_url = name_of_app_with_urls + ".delete_" + item_name
    get_base_url = name_of_app_with_urls + ".get_" + item_name

    add_url = reverse(add_base_url)
    edit_url = reverse(edit_base_url, args=["0"])[:-2]  # A number is required to get the url, then we cut it off with [:-2]  # noqa
    merge_url = reverse(merge_base_url, args=["0", "0"])[:-4]  # A number is required to get the url, then we cut it off with [:-4]  # noqa
    delete_url = reverse(delete_base_url, args=["0"])[:-2]  # A number is required to get the url, then we cut it off with [:-2]  # noqa
    get_url = reverse(get_base_url, args=["0"])[:-2]  # A number is required to get the url, then we cut it off with [:-2]  # noqa

    maced_data["get_urls"][item_name] = get_url

    urls = {}
    urls["add_url"] = add_url
    urls["edit_url"] = edit_url
    urls["merge_url"] = merge_url
    urls["delete_url"] = delete_url
    urls["get_url"] = get_url  # Don't really need it, but why not :)

    return urls


def build_builder(item_name, item_html_name, item_model, field_to_order_by, urls, item_options_list, field_list):
    builder = {}
    builder["item_name"] = item_name
    builder["item_html_name"] = item_html_name
    builder["items"] = get_items(item_model, field_to_order_by)
    builder["item_options_list"] = item_options_list
    builder["field_list"] = field_list
    builder["add_url"] = urls["add_url"]
    builder["edit_url"] = urls["edit_url"]
    builder["merge_url"] = urls["merge_url"]
    builder["delete_url"] = urls["delete_url"]
    builder["allow_empty"] = urls["allow_empty"]

    return builder


def build_templates(context, item_name, item_id, item_html_name, item_model, field_to_order_by, html_code_dictionary,
                    add_url, edit_url, merge_url, delete_url, allow_empty):
    subcontext = {}
    subcontext["item_id"] = item_id
    subcontext["item_name"] = item_name
    subcontext["item_html_name"] = item_html_name
    subcontext["items"] = get_items(item_model, field_to_order_by)
    subcontext["add_html_code"] = html_code_dictionary[item_name]["add"]
    subcontext["edit_html_code"] = html_code_dictionary[item_name]["edit"]
    subcontext["merge_html_code"] = html_code_dictionary[item_name]["merge"]
    subcontext["delete_html_code"] = html_code_dictionary[item_name]["delete"]
    subcontext["add_url"] = add_url
    subcontext["edit_url"] = edit_url
    subcontext["merge_url"] = merge_url
    subcontext["delete_url"] = delete_url
    subcontext["allow_empty"] = allow_empty

    context[item_name + "_item"] = render(request=None, template_name="maced/container.html", context=subcontext).content
    context[item_name + "_maced_modal"] = render(request=None, template_name="maced/modal_list.html", context=subcontext).content
    context["maced_modals"] += context[item_name + "_maced_modal"]


# Later, restrictions will be applied to incorporate permissions/public/private/etc.
def get_items(item_model, field_to_order_by=None):
    if field_to_order_by is None:
        items = item_model.objects.all()
    else:
        items = item_model.objects.all().order_by(field_to_order_by)

    return items