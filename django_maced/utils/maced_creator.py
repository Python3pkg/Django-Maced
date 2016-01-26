import inspect
import json

from django.core.urlresolvers import reverse
from django.shortcuts import render

from django_maced.utils.get_html_code_functions import get_items_html_code_for_text, \
    get_items_html_code_for_color, get_items_html_code_for_select, get_html_code_for_options

BAD_ITEM_NAME_CHARACTERS = (".", ":", "#", "$", "*")
ACTION_TYPES = ["add", "edit", "merge", "delete"]


# The main function to craft html code for each item. This is the only function that should be called directly besides
# finalize_context_for_items()
def add_item_to_context(context, item_name, item_html_name, item_class, item_name_field_name, field_list,
                        name_of_app_with_urls, current_item_id=0, allow_empty=True, item_ordering=None):
    if not isinstance(context, dict):
        raise TypeError("Please provide a valid context")

    if not isinstance(item_name, (str, unicode)):
        raise TypeError("item_name must be a string")

    if not inspect.isclass(item_class):
        raise TypeError("item_class must be a class")

    if not isinstance(item_name_field_name, (str, unicode)):
        raise TypeError("object_name_field_name must be a string")

    if not isinstance(field_list, list):
        raise TypeError("field_list must be a list")

    if not isinstance(name_of_app_with_urls, (str, unicode)):
        raise TypeError("name_of_app_with_urls must be a string")

    if not isinstance(allow_empty, bool):
        raise TypeError("allow_empty must be a bool")

    if item_ordering is None:
        item_ordering = item_name_field_name

    if not isinstance(item_ordering, (str, unicode)):
        raise TypeError("item_ordering must be a string that is the name of the field you want to order your objects by")

    if "maced_data" not in context:
        context["maced_data"] = {}

    maced_data = context["maced_data"]

    if "item_names" not in maced_data:
        maced_data["item_names"] = []

    if "field_names" not in maced_data:
        maced_data["field_names"] = {}

    if "get_urls" not in maced_data:
        maced_data["get_urls"] = {}

    html_code_dictionary = {}
    html_code_dictionary[item_name] = {}

    for action_type in ACTION_TYPES:
        html_code_dictionary[item_name][action_type] = ""

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
    field_name_list = []

    # Get all items of this type
    items = get_items(item_class)

    # Create an item_options_list which is a list of tuples defined as (id_of_the_item, name_of_the_item). This will
    # be used in the merge function.
    item_options_list = [(item.id, getattr(item, item_name_field_name)) for item in items]

    maced_object_option_html_code = get_html_code_for_options(item_options_list)

    # Merge has special html before the regular html
    html_code_dictionary[item_name]["merge"] = \
        '<table class="table table-striped">' + \
            '<tr>' + \
                '<th></th>' + \
                '<td>' + \
                    '<select class="form-control" id="merge-' + item_name + '1-input" disabled >' + maced_object_option_html_code + '</select>' + \
                '</td>' + \
                '<td>' + \
                '<b> Resulting ' + str(item_html_name) + ' </b>' + \
                '</td>' + \
                '<td>' + \
                    '<select class="form-control" id="merge-' + item_name + '2-input" disabled >' + maced_object_option_html_code + '</select>' + \
                '</td>' + \
            '</tr>'

    # Create html input fields for each field on the model
    for field in field_list:
        if "type" not in field:
            field["type"] = "text"

        if "html_name" not in field:
            field["html_name"] = field["name"].title()

        insert_items_html_code(html_code_dictionary, item_name, field["type"], field["html_name"], field["name"])
        field_name_list.append(field["name"])

    # Merge has special html after the regular html
    html_code_dictionary[item_name]["merge"] += "</table>"

    insert_field_names(context, item_name, field_name_list)

    sub_context = {}
    sub_context["item_id"] = current_item_id
    sub_context["item_name"] = item_name
    sub_context["item_html_name"] = item_html_name
    sub_context["items"] = item_class.objects.all().order_by(item_ordering)
    sub_context["add_html_code"] = html_code_dictionary[item_name]["add"]
    sub_context["edit_html_code"] = html_code_dictionary[item_name]["edit"]
    sub_context["merge_html_code"] = html_code_dictionary[item_name]["merge"]
    sub_context["delete_html_code"] = html_code_dictionary[item_name]["delete"]
    sub_context["add_url"] = add_url
    sub_context["edit_url"] = edit_url
    sub_context["merge_url"] = merge_url
    sub_context["delete_url"] = delete_url
    sub_context["allow_empty"] = allow_empty

    context[item_name + "_item"] = render(request=None, template_name="django_maced/container.html", context=sub_context).content


# Later, restrictions will be applied to incorporate permissions/public/private/etc.
def get_items(item_class):
    items = item_class.objects.all()

    return items


# original_dictionary is the dictionary that is being built up for a particular maced_item object.
#   When it is complete, it should be sent to get_context_data_for_maced_items to be added to the context.
# item_name is the name of the model.
# field_type is small set of predefined constants to support various html input types.
# field_html_name is the name that will be shown to the user for the modal that pops up after clicking add, edit, merge
#   or delete
# field_name is the name of the field on the model
# extra_info is an optional parameter that is used for special purposes depending on the item_type if the type uses it.
#   Example: Select uses extra_info for options information
def insert_items_html_code(original_dictionary, item_name, field_type, field_html_name, field_name, extra_info=None):
    if field_type == "text":
        for action_type in ACTION_TYPES:
            original_dictionary[item_name][action_type] += get_items_html_code_for_text(item_name, action_type, field_html_name, field_name)
    elif field_type == "color":
        for action_type in ACTION_TYPES:
            original_dictionary[item_name][action_type] += get_items_html_code_for_color(item_name, action_type, field_html_name, field_name)
    elif field_type == "select":
        for action_type in ACTION_TYPES:
            original_dictionary[item_name][action_type] += get_items_html_code_for_select(item_name, action_type, field_html_name, field_name, extra_info)
    else:
        raise TypeError("field_type of " + str(field_type) + " is not supported yet. (maced_items.py:get_items_html_code_in_dictionary())")


# This function adds all fields connected to this item, to the context.
def insert_field_names(context, item_name, field_name_list):
    maced_data = context["maced_data"]

    if item_name in maced_data["item_names"]:
        raise ValueError("Duplicate item var name of " + str(item_name))

    maced_data["item_names"].append(item_name)

    maced_data["field_names"][item_name] = field_name_list


# This function just does some serialization before pushing to the frontend. MUST be called after all html code has been
# generated and should only be called once
def finalize_context_for_items(context, login_url=None):
    if "maced_data" not in context:
        raise RuntimeError("maced_items is not configured correctly. Please check why maced_data is missing from the context.")

    maced_data = context["maced_data"]

    if "get_urls" not in maced_data or "field_names" not in maced_data:
        raise RuntimeError("ERROR: maced_items is not configured correctly. Please check why get_urls and/or field_names is missing from the context.")

    maced_data["get_urls"] = json.dumps(maced_data["get_urls"])
    maced_data["field_names"] = json.dumps(maced_data["field_names"])
    maced_data["login_url"] = json.dumps(login_url)