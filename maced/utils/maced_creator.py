import inspect
import json

from django.core.urlresolvers import reverse
from django.shortcuts import render
from maced.utils.constants import ACTION_TYPES, VALID_INPUT_TYPES, VALID_SELECT_TYPES

from maced.utils.get_html_code_functions import get_items_html_code_for_text, \
    get_items_html_code_for_color, get_items_html_code_for_select, get_html_code_for_options, \
    get_items_html_code_for_maced
from maced.utils.misc import validate_select_options


# The main function to craft html code for each item. This is the only function that should be called directly besides
#       finalize_context_for_items().
# item_name is the name of the model in most cases. You could potentially have 2 of the same model on a page, however
#       this will currently requires you to have 2 sets of urls which is kind of dumb, but still possible.
# item_html_name is the name that will show up on the frontend to the users. This is also the name used on the modals.
# item_model is the class of the model. Be sure to send in the class, not the instance of the class.
# item_name_field_name is the name of the field that stores the name for this model. Example: You have a model called
#       Gender. It will have some kind of field to identify the gender by. This will likely be called "name", but
#       could be called anything so it is required to be able to identify the object on the frontend.
# field_list is the specially formatted list of fields and their info. For more information please refer to the
#       README.md file.
# name_of_app_with_urls is the name of the app that has the urls that will be used for performing all of the actions
#       from maced. Please note that url names should be named according to AppName.Action_ItemName. Example:
#       App name is component_manager and the item is component. The url names should be
#       "component_manager.add_component", "component_manager.edit_component", etc
# current_item_id is the id of the item that will be selected by default on the frontend when you first land on the
#       page. If you do not need one preselected, use 0. Since it can be tedious to get the current_item_id for each
#       object if you have several for a page, you can simply use the get_current_item_id(model_instance, field_name)
#       function. Just pass it your related model and the field name of the field that this item represents. Example:
#       You have a model called Person with an attribute called City but it is not a required field for this Person
#       object. You want City to be a maced item, but you don't want to have to check if city is there for this
#       person, because if it doesn't you won't be able to say person.city.id because id isn't on None. Of course, you
#       can do this manually, but if you have several of these, it could be annoying and the code will look cluttered.
#       Instead use get_current_item_id(person, "city") and it will do the work for you and raise errors appropriately.
#       If city isn't set for this person, it will return 0, which will result in the first select item to be
#       preselected (should be a blank entry in the select in this case since city isn't required).
# allow_empty simply sets whether or not a blank will be inserted into the select. This defaults to True. Set this to
#       False if you want this field to be required. One caveat is that if you don't have any instances of this model
#       in the system yet and you make it required, nothing will prevent it from allowing you to submit the form and
#       will have to be handled on the backend. Perhaps this can be changed in the future.
# field_to_order_by is the field to order your select by. It defaults to None which converts to item_name_field_name.
#       Note that you can add "-" in front of the field_to_order_by to make it descending order.
def add_item_to_context(context, item_name, item_html_name, item_model, item_name_field_name, field_list,
                        name_of_app_with_urls, current_item_id, allow_empty=True, field_to_order_by=None):
    if not isinstance(context, dict):
        raise TypeError("Please provide a valid context")

    if not isinstance(item_name, (str, unicode)):
        raise TypeError("item_name must be a string")

    if not inspect.isclass(item_model):
        raise TypeError("item_model must be a class")

    if not isinstance(item_name_field_name, (str, unicode)):
        raise TypeError("object_name_field_name must be a string")

    if not isinstance(field_list, list):
        raise TypeError("field_list must be a list")

    if not isinstance(name_of_app_with_urls, (str, unicode)):
        raise TypeError("name_of_app_with_urls must be a string")

    if not isinstance(allow_empty, bool):
        raise TypeError("allow_empty must be a bool")

    if field_to_order_by is None:
        field_to_order_by = item_name_field_name

    if not isinstance(field_to_order_by, (str, unicode)):
        raise TypeError("field_to_order_by must be a string that is the name of the field you want to order your objects by")

    if "maced_data" not in context:
        context["maced_data"] = {}

    if "maced_modals" not in context:
        context["maced_modals"] = ""

    maced_data = context["maced_data"]

    if "item_names" not in maced_data:
        maced_data["item_names"] = []

    if item_name in maced_data["item_names"]:
        raise ValueError("Duplicate item var name of " + str(item_name))

    maced_data["item_names"].append(item_name)

    if "field_names" not in maced_data:
        maced_data["field_names"] = {}

    if "field_identifiers" not in maced_data:
        maced_data["field_identifiers"] = {}

    maced_data["field_names"][item_name] = []
    maced_data["field_identifiers"][item_name] = []

    if "get_urls" not in maced_data:
        maced_data["get_urls"] = {}

    # Get all items of this type
    items = get_items(item_model)

    # Create an item_options_list which is a list of tuples defined as (id_of_the_item, name_of_the_item). This will
    # be used in the merge function.
    item_options_list = [(item.id, getattr(item, item_name_field_name)) for item in items]

    # All the special html that is built in python
    html_code_dictionary = build_html_code(context, item_options_list, item_name, item_html_name, field_list)

    # Constructs urls
    urls = build_urls(html_code_dictionary, item_name, name_of_app_with_urls, maced_data)

    # context[item_name + "_dependencies"] = []

    # The final step of putting it all together to make 2 sets of html; one for the item on the page and one for the modal that pops up.
    build_templates(
        context, item_name, current_item_id, item_html_name, item_model, field_to_order_by, html_code_dictionary,
        urls["add_url"], urls["edit_url"], urls["merge_url"], urls["delete_url"], allow_empty
    )


# A nice helper function to simplify code for whoever is using this app. Since current_item_id is required, this makes
# getting it much easier. In many cases you don't need a current_item_id and should use 0 instead.
def get_current_item_id(model_instance, field_name):
    if model_instance is None:
        return 0

    if not isinstance(field_name, (str, unicode)):
        raise TypeError("field_name must be a string")

    if field_name == "":
        raise ValueError("field_name must not be an empty string")

    split_field_names = field_name.split(".")
    parent = model_instance
    path = model_instance.__class__.__name__

    for split_field_name in split_field_names:
        if not hasattr(parent, split_field_name):
            raise ValueError(path + " does not have the field named " + str(split_field_name))

        field = getattr(parent, split_field_name)

        if field is None:
            return 0

        parent = field
        path += "." + split_field_name

    # Ignore this warning. It is not possible to have a split_field_names length of 0, and even if it were possible,
    # catching that situation doesn't stop compilers from complaining about this anyway.
    return field.id


# Later, restrictions will be applied to incorporate permissions/public/private/etc.
def get_items(item_model):
    items = item_model.objects.all()

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
    if field_type == "maced":
        for action_type in ACTION_TYPES:
            original_dictionary[item_name][action_type] += get_items_html_code_for_maced(item_name, action_type, field_html_name, field_name, extra_info)
    elif field_type == "text":
        for action_type in ACTION_TYPES:
            original_dictionary[item_name][action_type] += get_items_html_code_for_text(item_name, action_type, field_html_name, field_name)
    elif field_type == "color":
        for action_type in ACTION_TYPES:
            original_dictionary[item_name][action_type] += get_items_html_code_for_color(item_name, action_type, field_html_name, field_name)
    elif field_type == "select":
        for action_type in ACTION_TYPES:
            original_dictionary[item_name][action_type] += get_items_html_code_for_select(item_name, action_type, field_html_name, field_name, extra_info)
    else:
        raise TypeError("field_type of " + str(field_type) + " is not supported yet. (maced_items.py:insert_items_html_code())")


def build_html_code(context, item_options_list, item_name, item_html_name, field_list):
    html_code_dictionary = {}
    html_code_dictionary[item_name] = {}

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

            # if field["maced_name"] + "_dependencies" not in context:
            #     raise RuntimeError(field["maced_name"] + "_dependencies was not in the context. Did you overwrite it?")

            # context[item_name + "_dependencies"].append(field["maced_name"])

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


def build_urls(html_code_dictionary, item_name, name_of_app_with_urls, maced_data):
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

    urls = {}
    urls["add_url"] = add_url
    urls["edit_url"] = edit_url
    urls["merge_url"] = merge_url
    urls["delete_url"] = delete_url
    urls["get_url"] = get_url  # Don't really need it, but why not :)

    return urls


def build_templates(context, item_name, item_id, item_html_name, item_model, field_to_order_by, html_code_dictionary,
                    add_url, edit_url, merge_url, delete_url, allow_empty):
    context[item_name + "_builder"] = {}
    builder = context[item_name + "_builder"]

    builder["item_id"] = item_id
    builder["item_name"] = item_name
    builder["item_html_name"] = item_html_name
    builder["items"] = item_model.objects.all().order_by(field_to_order_by)
    builder["add_html_code"] = html_code_dictionary[item_name]["add"]
    builder["edit_html_code"] = html_code_dictionary[item_name]["edit"]
    builder["merge_html_code"] = html_code_dictionary[item_name]["merge"]
    builder["delete_html_code"] = html_code_dictionary[item_name]["delete"]
    builder["add_url"] = add_url
    builder["edit_url"] = edit_url
    builder["merge_url"] = merge_url
    builder["delete_url"] = delete_url
    builder["allow_empty"] = allow_empty

    context[item_name + "_item"] = render(request=None, template_name="maced/container.html", context=builder).content
    context[item_name + "_maced_modal"] = render(request=None, template_name="maced/modal_list.html", context=builder).content
    context["maced_modals"] += context[item_name + "_maced_modal"]


# This function just does some serialization before pushing to the frontend. MUST be called after all html code has been
# generated and should only be called once
def finalize_context_for_items(context, login_url=None):
    if "maced_data" not in context:
        raise RuntimeError("maced_items is not configured correctly. Please check why maced_data is missing from the context.")

    maced_data = context["maced_data"]

    if "get_urls" not in maced_data or "field_names" not in maced_data or "field_identifiers" not in maced_data:
        raise RuntimeError(
            "ERROR: maced_items is not configured correctly. Please check why get_urls and/or field_names and/or "
            "field_identifiers is missing from the context."
        )

    maced_data["get_urls"] = json.dumps(maced_data["get_urls"])
    maced_data["field_names"] = json.dumps(maced_data["field_names"])
    maced_data["field_identifiers"] = json.dumps(maced_data["field_identifiers"])
    maced_data["login_url"] = json.dumps(login_url)